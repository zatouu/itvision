/**
 * Rattachement produit ↔ catégorie, fondé sur l'arborescence (famille →
 * sous-catégories). Les produits portent un slug normalisé par le modèle
 * Product (classifieur) : une famille regroupe ses propres produits et ceux
 * de ses sous-catégories. Utilisé par la section « Catégories populaires ».
 */
import { categoryTreeDescendants } from './category-tree'

const normalizeSlug = (s?: string | null) => String(s || '').trim().toLowerCase()

/** Slugs couverts par une catégorie : elle-même + sous-catégories (arbre + base). */
export function categoryScope(slug: string, extraSubSlugs: string[] = []): Set<string> {
  const scope = new Set(categoryTreeDescendants(normalizeSlug(slug)))
  for (const s of extraSubSlugs) if (s) scope.add(normalizeSlug(s))
  return scope
}

export function productMatchesCategory(
  product: { category?: string | null },
  categorySlug: string,
  extraSubSlugs: string[] = []
): boolean {
  if (!categorySlug) return false
  return categoryScope(categorySlug, extraSubSlugs).has(normalizeSlug(product.category))
}

const isUsableImage = (value: unknown): value is string => typeof value === 'string' && !!value && !value.includes('placeholder')

/**
 * Compte les produits de chaque catégorie (sous-catégories incluses).
 * `subSlugsByCategory` : sous-catégories déclarées en base, en plus de l'arbre.
 */
export function countProductsByCategory<T extends { category?: string | null; image?: unknown; gallery?: unknown }>(
  products: T[],
  slugs: string[],
  subSlugsByCategory: Record<string, string[]> = {}
): Map<string, { count: number; image?: string; images?: string[] }> {
  const result = new Map<string, { count: number; image?: string; images?: string[] }>()
  const scopes = slugs.map((slug) => [slug, categoryScope(slug, subSlugsByCategory[slug])] as const)
  for (const slug of slugs) result.set(slug, { count: 0, images: [] })
  for (const p of products) {
    const cat = normalizeSlug(p.category)
    if (!cat) continue
    // Photo principale, sinon première photo de la galerie (certains imports n'ont qu'une galerie)
    const img = isUsableImage(p.image) ? p.image : Array.isArray(p.gallery) ? p.gallery.find(isUsableImage) : undefined
    for (const [slug, scope] of scopes) {
      if (!scope.has(cat)) continue
      const entry = result.get(slug)!
      entry.count += 1
      if (img && (entry.images?.length ?? 0) < 5) entry.images!.push(img)
      if (!entry.image && img) entry.image = img
    }
  }
  return result
}