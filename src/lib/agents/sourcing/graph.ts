/**
 * Graphe LangGraph « sourcing_scan » — veille produits 1688.
 * Voir docs/DAT_AGENTS_IA.md.
 *
 * search → extract → score → importDrafts → report
 *
 * L'agent joue le rôle d'un acheteur humain sur 1688 : navigateur réel
 * (stealth + profil persisté), pacing humain entre les pages, arrêt propre
 * sur CAPTCHA/mur de login (pas de contournement — notification admin).
 *
 * Pas d'interrupt() ici : les produits sont importés en BROUILLON
 * (isPublished: false). Le HITL critique est délégué au graphe
 * product_moderation, enchaîné automatiquement sur chaque brouillon.
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import Product from '@/lib/models/Product'
import { notifyAdmins } from '@/lib/notify'
import { enqueueAgentJob } from '../queue'
import { BrowserScraper, humanDelay, Product1688, ScrapingResult, search1688ViaEngines } from '@/lib/browser-scraper'
import { toChineseQuery } from './query-translate'
import { computeProductPricing } from '@/lib/logistics'
import { DEFAULT_EXCHANGE_RATE, DEFAULT_SERVICE_FEE_RATE, DEFAULT_INSURANCE_RATE } from '@/lib/pricing/constants'

/** Marge commerciale suggérée sur les imports (au-delà des frais service+assurance) */
const MARGIN_RATE = Number(process.env.SOURCING_MARGIN_RATE || 15)
/** Échecs consécutifs avant d'arrêter l'extraction (probablement bloqués) */
const MAX_CONSECUTIVE_FAILURES = 3

const SourcingState = Annotation.Root({
  jobId: Annotation<string>,
  query: Annotation<string>,
  category: Annotation<string>,
  maxItems: Annotation<number>,
  groupBuyEligible: Annotation<boolean>,
  directUrls: Annotation<string[]>,
  offerUrls: Annotation<string[]>,
  extracted: Annotation<Product1688[]>,
  failed: Annotation<string[]>,
  blockedReason: Annotation<string | undefined>,
  scored: Annotation<Array<{ product: Product1688; baseCost: number; exchangeRate: number; suggestedPrice: number }>>,
  imported: Annotation<Array<{ productId: string; name: string; price: number }>>,
  summary: Annotation<Record<string, unknown>>,
})

// Le navigateur ne peut pas vivre dans l'état (non sérialisable) — singleton
// module-level, sûr car le worker borne la concurrence sourcing_scan à 1.
let scraper: BrowserScraper | null = null

export async function closeSourcingBrowser() {
  if (scraper) {
    await scraper.close().catch(() => {})
    scraper = null
  }
}

async function getScraper(): Promise<BrowserScraper> {
  if (!scraper) {
    scraper = new BrowserScraper({
      // SCRAPER_HEADLESS=false → navigateur visible : permet le login 1688
      // manuel initial (la session est persistée dans le profil).
      headless: process.env.SCRAPER_HEADLESS !== 'false',
      // Profil persisté par défaut : la session 1688 (login manuel préalable)
      // survit entre les scans → franchit les murs de login.
      profileDir: process.env.SCRAPER_PROFILE_DIR || 'data/browser-profile',
    })
    await scraper.init()
  }
  return scraper
}

const BLOCK_PATTERNS = /captcha|robot|verify|verification|login|sign\s?in|access.*denied|blocked|SEARCH_EMPTY/i

/**
 * Découverte d'URLs d'offres 1688 — partagée par sourcing_scan et
 * sourcing_request. Ordre : moteurs (rapide, pas de login) → recherche
 * interne via navigateur (si session persistée authentifiée).
 */
export async function discover1688Urls(
  query: string,
  maxItems: number
): Promise<{ urls: string[]; blockedReason?: string }> {
  // Les listings 1688 sont chinois : traduire la requête FR avant la
  // recherche moteurs, sinon les résultats sont hors-sujet.
  const zhQuery = await toChineseQuery(query)
  if (zhQuery !== query) console.log(`[sourcing] requête traduite : « ${query} » → « ${zhQuery} »`)

  console.log(`[sourcing] recherche moteurs pour « ${zhQuery} »…`)
  const engineUrls = await search1688ViaEngines(zhQuery, maxItems)
  console.log(`[sourcing] moteurs → ${engineUrls.length} URLs`)
  if (engineUrls.length > 0) return { urls: engineUrls }

  // La recherche interne s.1688.com est protégée par le 风控 Alibaba : mur de
  // login même avec session authentifiée sur IP non chinoise. Opt-in uniquement
  // (worker hébergé en Chine : SCRAPER_1688_INTERNAL_SEARCH=1).
  if (process.env.SCRAPER_1688_INTERNAL_SEARCH !== '1') {
    return { urls: [] }
  }
  console.log('[sourcing] moteurs vides — fallback navigateur 1688')
  const s = await getScraper()
  const result = await s.search1688(zhQuery, maxItems)
  if (!result.success || !result.data?.length) {
    const reason = result.error || 'aucun résultat'
    return { urls: [], blockedReason: BLOCK_PATTERNS.test(reason) ? reason : undefined }
  }
  return { urls: result.data }
}

async function search(state: typeof SourcingState.State) {
  const empty = {
    extracted: [] as Product1688[],
    failed: [] as string[],
    imported: [] as Array<{ productId: string; name: string; price: number }>,
  }

  // URLs fournies directement (ex: liens envoyés par les contacts en Chine)
  if (state.directUrls?.length) {
    return { ...empty, offerUrls: state.directUrls.slice(0, state.maxItems) }
  }

  const { urls, blockedReason } = await discover1688Urls(state.query, state.maxItems)
  return { ...empty, offerUrls: urls, blockedReason }
}

/** Extraction d'une fiche 1688 avec timeout dur — partagée par les 2 agents sourcing. */
export async function scrapeOne1688(url: string): Promise<ScrapingResult<Product1688>> {
  const s = await getScraper()
  return Promise.race<Promise<ScrapingResult<Product1688>>>([
    s.scrape1688(url, 1),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 120s')), 120000)) as Promise<ScrapingResult<Product1688>>,
  ]).catch((e: Error) => ({ success: false, error: e.message, attempts: 0, durationMs: 0 }) as ScrapingResult<Product1688>)
}

/** Retire les fragments « nom d'entreprise » d'un titre 1688
 *  (ex: « écouteurs X — 深圳市XX有限公司 » → « écouteurs X »). */
export function cleanProductName(name: string | undefined): string {
  if (!name) return ''
  return name
    .split(/[-—_|·,，]/)
    .filter((seg) => !/公司|co\.?\s*ltd|company|factory|厂|旗舰店|专营店|超市/i.test(seg))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Filtre qualité partagé : nom inexploitable même nettoyé, ou prix « acompte » < 2 ¥ */
export function isQualityProduct(p: Product1688 | undefined): { ok: boolean; nameOk: boolean; priceOk: boolean; cleanedName?: string } {
  const cleanedName = cleanProductName(p?.name)
  const nameOk = cleanedName.length >= 5 && cleanedName !== 'Produit 1688'
  const priceOk = typeof p?.price1688 === 'number' && p.price1688 >= 2
  return { ok: nameOk && priceOk, nameOk, priceOk, cleanedName: nameOk ? cleanedName : undefined }
}

function gateAfterSearch(state: typeof SourcingState.State) {
  return state.offerUrls.length > 0 ? 'extract' : 'report'
}

async function extract(state: typeof SourcingState.State) {
  const extracted: Product1688[] = []
  const failed: string[] = []
  let consecutiveFailures = 0
  let blockedReason: string | undefined

  for (const url of state.offerUrls) {
    // Pacing humain : un vrai acheteur lit une fiche, ne les enchaîne pas
    if (extracted.length + failed.length > 0) await humanDelay(4000, 9000)

    const t0 = Date.now()
    // 1 seul retry interne + timeout dur 120s : un échec sur une URL
    // ne doit pas bloquer le scan entier.
    const result = await scrapeOne1688(url)
    console.log(`[sourcing] ${result.success ? '✓' : '✗'} ${url} (${Math.round((Date.now() - t0) / 1000)}s)`)
    const d = result.data
    // Qualité : nom générique/entreprise = extraction ratée ; prix < 2 CNY =
    // quasi toujours un acompte (定金) ou accessoire — pas un produit vendable.
    const { ok: qualityOk, cleanedName } = isQualityProduct(d)
    const qualityFailed = !qualityOk
    if (result.success && !qualityFailed) {
      if (cleanedName) d!.name = cleanedName
      extracted.push(d!)
      consecutiveFailures = 0
    } else {
      failed.push(url)
      // Skip qualité ≠ échec réseau : la page a chargé, on ne la compte pas
      // dans le détecteur de blocage.
      const qualitySkip = result.success && qualityFailed
      if (!qualitySkip) {
        consecutiveFailures++
        const err = result.error || ''
        // Enchaînement d'échecs ou signal de blocage → on stoppe proprement
        if (BLOCK_PATTERNS.test(err) || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          blockedReason = err || `${consecutiveFailures} échecs consécutifs`
          break
        }
      } else {
        consecutiveFailures = 0
        console.log(`[sourcing] ignoré (qualité) — nom:«${d?.name?.slice(0, 40)}» prix:¥${d?.price1688}`)
      }
    }
  }

  return { extracted, failed, blockedReason }
}

/** Prix suggéré = sourcing (CNY→FCFA) + marge + frais de service + assurance.
 *  Délègue à computeProductPricing — la même formule que le reste de la plateforme. */
function score(state: typeof SourcingState.State) {
  const scored = state.extracted.map((p) => {
    const exchangeRate = p.exchangeRate > 0 ? p.exchangeRate : DEFAULT_EXCHANGE_RATE
    const baseCost = Math.round((p.price1688 || 0) * exchangeRate)
    const pricing = computeProductPricing({
      baseCost,
      marginRate: MARGIN_RATE,
      serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
      insuranceRate: DEFAULT_INSURANCE_RATE,
      price1688: p.price1688,
      exchangeRate,
      currency: 'FCFA',
      sourcing: { platform: '1688', supplierName: p.supplier?.name || '', supplierContact: '', productUrl: p.productUrl, notes: '' },
      stockStatus: 'preorder',
    })
    // Prix affiché arrondi au 500 F supérieur (convention marketplace)
    const raw = pricing.totalWithFees ?? baseCost
    const suggestedPrice = Math.ceil(raw / 500) * 500
    return { product: p, baseCost, exchangeRate, suggestedPrice }
  })
  return { scored }
}

async function importDrafts(state: typeof SourcingState.State) {
  const imported: Array<{ productId: string; name: string; price: number }> = []

  for (const item of state.scored || []) {
    const p = item.product
    // Dédup par URL source — la convention existante (api/products/import)
    const exists = await Product.findOne({ 'sourcing.productUrl': p.productUrl }).select('_id').lean()
    if (exists) continue

    const specsMd = Object.entries(p.specifications || {})
      .slice(0, 12)
      .map(([k, v]) => `- **${k}** : ${v}`)
      .join('\n')
    const description = [
      p.description || p.tagline || `Produit sourcé sur 1688 — fournisseur ${p.supplier?.name || 'vérifié'}`,
      p.features?.length ? `\n\n**Points forts**\n${p.features.slice(0, 8).map(f => `- ${f}`).join('\n')}` : '',
      specsMd ? `\n\n**Caractéristiques**\n${specsMd}` : '',
      p.moq ? `\n\nQuantité min. fournisseur : ${p.moq} pcs` : '',
    ].filter(Boolean).join('\n').slice(0, 4000)

    const created = await Product.create({
      name: p.name.slice(0, 200),
      description,
      category: state.category || 'Import Chine',
      tagline: p.tagline || `Sourcé 1688${p.supplier?.name ? ` • ${p.supplier.name}` : ''}`,
      price: item.suggestedPrice,
      currency: 'FCFA',
      baseCost: item.baseCost,
      marginRate: MARGIN_RATE,
      image: p.image || p.gallery?.[0],
      gallery: (p.gallery || []).slice(0, 8),
      features: (p.features || []).slice(0, 8),
      requiresQuote: !item.suggestedPrice,
      stockStatus: 'preorder',
      stockQuantity: 50,
      leadTimeDays: 15,
      availabilityNote: p.availabilityNote || 'Import 1688 — délai à confirmer',
      isPublished: false,
      price1688: p.price1688,
      price1688Currency: 'CNY',
      exchangeRate: item.exchangeRate,
      serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
      insuranceRate: DEFAULT_INSURANCE_RATE,
      weightKg: p.weightKg || 1,
      lengthCm: p.lengthCm || 10,
      widthCm: p.widthCm || 10,
      heightCm: p.heightCm || 10,
      variantGroups: p.variantGroups || [],
      sourcing: {
        platform: '1688',
        supplierName: p.supplier?.name,
        productUrl: p.productUrl,
        notes: `Veille agent « ${state.query} »${p.offerId ? ` — offerId ${p.offerId}` : ''}${p.moq ? ` — MOQ ${p.moq}` : ''}`,
      },
      ...(state.groupBuyEligible
        ? { groupBuyEnabled: true, groupBuyMinQty: 5, groupBuyTargetQty: 20 }
        : {}),
      shippingOverrides: [],
    })

    imported.push({ productId: String(created._id), name: created.name, price: item.suggestedPrice })
    // Le HITL : chaque brouillon passe par le graphe modération avant publication
    await enqueueAgentJob('product_moderation', String(created._id))
  }

  return { imported }
}

async function report(state: typeof SourcingState.State) {
  const stats = {
    query: state.query,
    found: state.offerUrls?.length || 0,
    extracted: state.extracted?.length || 0,
    imported: state.imported?.length || 0,
    skipped: state.failed?.length || 0,
    blocked: state.blockedReason || null,
  }

  if (state.blockedReason) {
    await notifyAdmins({
      type: 'warning',
      title: 'Veille 1688 bloquée',
      message: `Scan « ${state.query} » interrompu : ${state.blockedReason}. La session 1688 a probablement expiré — reconnectez le profil navigateur ou relancez plus tard.`,
      actionUrl: '/admin/sourcing',
      metadata: stats,
      push: true,
    })
  }

  await notifyAdmins({
    type: state.imported.length > 0 ? 'success' : 'info',
    title: 'Veille sourcing terminée',
    message: `« ${state.query} » : ${stats.found} offres → ${stats.extracted} extraites → ${stats.imported} brouillons importés (en file de modération).`,
    actionUrl: '/admin/copilot',
    metadata: stats,
  })

  await closeSourcingBrowser()
  return { summary: stats }
}

let compiled: ReturnType<typeof build> | null = null

function build() {
  return new StateGraph(SourcingState)
    .addNode('search', search)
    .addNode('extract', extract)
    .addNode('score', score)
    .addNode('importDrafts', importDrafts)
    .addNode('report', report)
    .addEdge(START, 'search')
    .addConditionalEdges('search', gateAfterSearch)
    .addEdge('extract', 'score')
    .addEdge('score', 'importDrafts')
    .addEdge('importDrafts', 'report')
    .addEdge('report', END)
    .compile()
}

export function getSourcingGraph() {
  if (!compiled) compiled = build()
  return compiled
}
