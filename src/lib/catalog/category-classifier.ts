/**
 * Classement automatique d'un produit dans l'arbre de catégories de référence.
 * Combine la catégorie existante (slug, libellé ou texte libre d'import) et le nom
 * du produit : un produit mal rangé (« Trottinette » dans « Électronique ») est
 * déplacé, une catégorie cohérente est conservée.
 */
import { CATEGORY_TREE, GENERIC_CATEGORY_TEXTS, categoryFamilyOf } from './category-tree'

export function normalizeCategoryText(value?: string | null): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

interface KeywordEntry {
  kw: string
  slug: string
  family: string
  isFamily: boolean
  /** Mots courts (≤ 4 car.) : correspondance sur mot entier uniquement. */
  wholeWord: boolean
}

interface Hit {
  slug: string
  family: string
  isFamily: boolean
  pos: number
  len: number
}

const KEYWORDS: KeywordEntry[] = []
const EXACT = new Map<string, { slug: string; family: string; isFamily: boolean }>()
const GENERIC = new Set(GENERIC_CATEGORY_TEXTS.map(normalizeCategoryText))

function registerExact(text: string, slug: string, family: string, isFamily: boolean) {
  const key = normalizeCategoryText(text)
  if (key && !EXACT.has(key)) EXACT.set(key, { slug, family, isFamily })
}

function registerKeywords(list: string[] | undefined, slug: string, family: string, isFamily: boolean) {
  for (const raw of list || []) {
    const kw = normalizeCategoryText(raw)
    if (kw) KEYWORDS.push({ kw, slug, family, isFamily, wholeWord: kw.length <= 4 })
  }
}

// Slugs et libellés d'abord (priorité), alias ensuite.
for (const family of CATEGORY_TREE) {
  registerExact(family.slug, family.slug, family.slug, true)
  registerExact(family.name, family.slug, family.slug, true)
  for (const sub of family.subs) {
    registerExact(sub.slug, sub.slug, family.slug, false)
    registerExact(sub.name, sub.slug, family.slug, false)
  }
}
for (const family of CATEGORY_TREE) {
  for (const alias of family.aliases || []) registerExact(alias, family.slug, family.slug, true)
  registerKeywords(family.keywords, family.slug, family.slug, true)
  for (const sub of family.subs) {
    for (const alias of sub.aliases || []) registerExact(alias, sub.slug, family.slug, false)
    registerKeywords(sub.keywords, sub.slug, family.slug, false)
  }
}

function rawHits(text: string): Hit[] {
  const hits: Hit[] = []
  if (!text) return hits
  for (const entry of KEYWORDS) {
    let from = 0
    while (from <= text.length) {
      const pos = text.indexOf(entry.kw, from)
      if (pos < 0) break
      const end = pos + entry.kw.length
      const startOk = pos === 0 || text[pos - 1] === ' '
      const endOk = !entry.wholeWord || end === text.length || text[end] === ' '
      if (startOk && endOk) {
        hits.push({ slug: entry.slug, family: entry.family, isFamily: entry.isFamily, pos, len: entry.kw.length })
        break
      }
      from = pos + 1
    }
  }
  return hits
}

/** Écarte les mots-clés inclus dans un mot-clé plus long (« ampoule » dans « ampoule led »). */
function suppressOverlaps(hits: Hit[]): Hit[] {
  const sorted = [...hits].sort((a, b) => b.len - a.len)
  const kept: Hit[] = []
  for (const h of sorted) {
    const inside = kept.some((k) => h.pos >= k.pos && h.pos + h.len <= k.pos + k.len && (h.len < k.len || h.slug !== k.slug))
    if (!inside) kept.push(h)
  }
  return kept
}

/** Premier terme rencontré dans le texte, puis le plus long. */
function bestHit(hits: Hit[]): Hit | undefined {
  const pool = suppressOverlaps(hits)
  const subs = pool.filter((h) => !h.isFamily)
  const candidates = subs.length ? subs : pool
  return candidates.sort((a, b) => a.pos - b.pos || b.len - a.len)[0]
}

export interface CategoryResolution {
  slug: string
  family: string
  isFamily: boolean
}

/** Correspondance exacte (slug, libellé, alias) — jamais d'heuristique. */
export function resolveCategoryExact(category?: string | null): CategoryResolution | undefined {
  return EXACT.get(normalizeCategoryText(category))
}

export function isGenericCategory(category?: string | null): boolean {
  const key = normalizeCategoryText(category)
  return !key || GENERIC.has(key)
}

/** Meilleure catégorie d'après un texte seul (nom produit, libellé libre…). */
export function classifyText(text?: string | null): CategoryResolution | undefined {
  const hit = bestHit(rawHits(normalizeCategoryText(text)))
  return hit ? { slug: hit.slug, family: hit.family, isFamily: hit.isFamily } : undefined
}

/**
 * Catégorie de référence pour un produit. Renvoie le slug retenu, ou la valeur
 * d'origine (trimée) si rien n'est reconnu — une catégorie personnalisée reste intacte.
 */
export function classifyProductCategory(category?: string | null, name?: string | null): string {
  const original = String(category ?? '').trim()
  const nameHits = rawHits(normalizeCategoryText(name))
  const overall = bestHit(nameHits)

  let target: CategoryResolution | undefined
  if (!isGenericCategory(original)) {
    target = resolveCategoryExact(original) || classifyText(original)
  }
  if (!target) return overall?.slug ?? original

  if (target.isFamily) {
    const familyHits = nameHits.filter((h) => h.family === target!.family)
    const inFamily = bestHit(familyHits.filter((h) => !h.isFamily))
    if (inFamily) return inFamily.slug
    if (familyHits.length) return target.slug
    return overall && !overall.isFamily ? overall.slug : target.slug
  }

  const kept = suppressOverlaps(nameHits)
  if (kept.some((h) => h.slug === target!.slug)) return target.slug
  const familyHits = kept.filter((h) => h.family === target!.family)
  if (familyHits.length) return bestHit(familyHits.filter((h) => !h.isFamily))?.slug ?? target.slug
  return overall && !overall.isFamily ? overall.slug : target.slug
}

/** Vrai si `slug` est `parent` ou l'une de ses sous-catégories de référence. */
export function isInCategoryFamily(slug: string, parent: string): boolean {
  return slug === parent || categoryFamilyOf(slug) === parent
}

/**
 * Normalise une catégorie reçue à l'écriture (import, formulaire, API) :
 * - sous-catégorie connue (slug/libellé/alias) → son slug, choix explicite respecté ;
 * - famille ou libellé d'import reconnu → affiné d'après le nom ;
 * - texte générique (« Catalogue import Chine ») → déduit du nom ;
 * - texte libre inconnu (catégorie personnalisée) → conservé tel quel.
 */
export function normalizeIncomingCategory(category?: string | null, name?: string | null): string {
  const original = String(category ?? '').trim()
  if (isGenericCategory(original)) return classifyProductCategory('', name)
  const exact = resolveCategoryExact(original)
  if (exact) return exact.isFamily ? classifyProductCategory(original, name) : exact.slug
  return classifyText(original) ? classifyProductCategory(original, name) : original
}
