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
import {
  BrowserScraper, humanDelay, classifySourceUrl,
  Product1688, ProductAliExpress, ScrapingResult, SourcePlatform,
  search1688ViaEngines, searchAliExpressViaEngines, searchAlibabaViaEngines,
  searchAliExpressNative, searchAlibabaNative,
} from '@/lib/browser-scraper'
import { toChineseQuery } from './query-translate'
import { computeProductPricing } from '@/lib/logistics'
import { sourceCurrencyRate, minSourcePrice, DEFAULT_SERVICE_FEE_RATE, DEFAULT_INSURANCE_RATE } from '@/lib/pricing/constants'

const PLATFORM_LABEL: Record<SourcePlatform, string> = {
  '1688': '1688',
  aliexpress: 'AliExpress',
  alibaba: 'Alibaba',
}

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
 * Découverte d'URLs d'offres multi-sources — partagée par sourcing_scan et
 * sourcing_request. 1688 (listings chinois → requête traduite + originale)
 * puis AliExpress/Alibaba (listings internationaux → requête originale EN/FR,
 * pas de traduction). Ordre : moteurs (rapide, pas de login) → recherche
 * interne 1688 via navigateur (opt-in, si session authentifiée).
 */
export async function discoverSourceUrls(
  query: string,
  maxItems: number
): Promise<{ urls: string[]; blockedReason?: string }> {
  // Les listings 1688 sont chinois : traduire la requête FR avant la
  // recherche moteurs, sinon les résultats sont hors-sujet.
  const zhQuery = await toChineseQuery(query)
  if (zhQuery !== query) console.log(`[sourcing] requête traduite : « ${query} » → « ${zhQuery} »`)

  console.log(`[sourcing] recherche moteurs pour « ${zhQuery} »…`)
  const engineUrls = await search1688ViaEngines(zhQuery, maxItems)
  console.log(`[sourcing] moteurs 1688 → ${engineUrls.length} URLs`)

  // Requête originale en complément : les marques/modèles latin (dahua, a9pro,
  // nvr…) existent verbatim dans les titres 1688 — la traduction peut les perdre.
  if (zhQuery !== query && engineUrls.length < maxItems) {
    const rawUrls = await search1688ViaEngines(query, maxItems - engineUrls.length)
    const seen = new Set(engineUrls)
    for (const u of rawUrls) if (!seen.has(u)) { seen.add(u); engineUrls.push(u) }
    if (rawUrls.length) console.log(`[sourcing] +requête originale → ${engineUrls.length} URLs total`)
  }

  // AliExpress + Alibaba : listings internationaux (EN) — la requête
  // originale s'applique telle quelle, pas de traduction nécessaire.
  // Chemin primaire : pages de recherche natives (SSR, fiables) ;
  // moteurs en complément si la recherche native est vide.
  const intlLimit = Math.max(3, Math.ceil(maxItems / 3))
  let [aeUrls, alibabaUrls] = await Promise.all([
    searchAliExpressNative(query, intlLimit),
    searchAlibabaNative(query, intlLimit),
  ])
  if (aeUrls.length < intlLimit) {
    const extra = await searchAliExpressViaEngines(query, intlLimit - aeUrls.length)
    aeUrls = [...aeUrls, ...extra.filter((u) => !aeUrls.includes(u))]
  }
  if (alibabaUrls.length < intlLimit) {
    const extra = await searchAlibabaViaEngines(query, intlLimit - alibabaUrls.length)
    alibabaUrls = [...alibabaUrls, ...extra.filter((u) => !alibabaUrls.includes(u))]
  }
  // Alibaba sert une « punish page » au fetch nu dès quelques requêtes —
  // dernier recours : la page de recherche via le navigateur réel (déjà
  // démarré pour l'extraction, le coût est marginal).
  if (alibabaUrls.length === 0) {
    try {
      const s = await getScraper()
      const r = await s.searchAlibaba(query, intlLimit)
      if (r.success && r.data?.length) {
        alibabaUrls = r.data
        console.log(`[sourcing] Alibaba via navigateur → ${alibabaUrls.length} URLs`)
      }
    } catch (e: any) {
      console.warn(`[sourcing] recherche Alibaba navigateur échouée: ${e?.message}`)
    }
  }
  const seen = new Set(engineUrls)
  for (const u of [...aeUrls, ...alibabaUrls]) {
    if (!seen.has(u)) { seen.add(u); engineUrls.push(u) }
  }
  if (aeUrls.length + alibabaUrls.length > 0) {
    console.log(`[sourcing] +AliExpress ${aeUrls.length} +Alibaba ${alibabaUrls.length} → ${engineUrls.length} URLs total`)
  }
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

  const { urls, blockedReason } = await discoverSourceUrls(state.query, state.maxItems)
  return { ...empty, offerUrls: urls, blockedReason }
}

/** Normalise une fiche AliExpress/Alibaba (ProductAliExpress) vers le shape
 *  candidat commun Product1688 : prix source dans sa devise, taux dédié,
 *  plateforme explicite. */
function normalizeInternational(d: ProductAliExpress, platform: SourcePlatform, url: string): Product1688 {
  const cur = d.priceCurrency || 'USD'
  return {
    name: d.name,
    productUrl: url,
    image: d.image,
    gallery: d.gallery || [],
    price1688: d.price,                       // prix source dans sa devise
    price1688Currency: cur,
    platform,
    exchangeRate: sourceCurrencyRate(cur),
    currency: 'FCFA',
    category: d.category || 'Import Chine',
    tagline: d.tagline || `Import ${PLATFORM_LABEL[platform]}`,
    availabilityNote: d.availabilityNote || `Import ${PLATFORM_LABEL[platform]} — délai à confirmer`,
    features: d.features || [],
    weightKg: d.weightKg || 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10,
    specifications: {},
    // Alibaba B2B : orders porte le MOQ. AliExpress : orders = ventes réelles.
    moq: platform === 'alibaba' ? d.orders : undefined,
    supplier: d.shopName
      ? {
          name: d.shopName,
          location: '',
          verified: false,
          yearsInBusiness: d.shopYears || 0,
          rating: d.shopRating || d.rating || 0,
          transactions: platform === 'aliexpress' ? d.orders || 0 : 0,
          responseTime: '',
        }
      : undefined,
    description: `Produit sourcé sur ${PLATFORM_LABEL[platform]} — fournisseur ${d.shopName || 'à vérifier'}`,
  }
}

/** Extraction d'une fiche fournisseur avec timeout dur — dispatch par
 *  plateforme (1688/AliExpress/Alibaba), normalisée en Product1688.
 *  Partagée par les 2 agents sourcing. */
export async function scrapeOneSource(url: string): Promise<ScrapingResult<Product1688>> {
  const platform = classifySourceUrl(url)
  if (!platform) return { success: false, error: `URL non supportée : ${url}`, attempts: 0, durationMs: 0 }
  const s = await getScraper()
  const raw = await Promise.race<Promise<ScrapingResult<Product1688 | ProductAliExpress>>>([
    platform === '1688'
      ? s.scrape1688(url, 1)
      : platform === 'aliexpress'
        ? s.scrapeAliExpress(url, 1)
        : s.scrapeAlibaba(url, 1),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 120s')), 120000)) as Promise<ScrapingResult<Product1688>>,
  ]).catch((e: Error) => ({ success: false, error: e.message, attempts: 0, durationMs: 0 }) as ScrapingResult<Product1688>)
  if (!raw.success || !raw.data || platform === '1688') return raw as ScrapingResult<Product1688>
  return { ...raw, data: normalizeInternational(raw.data as ProductAliExpress, platform, url) }
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

/** Filtre qualité partagé : nom inexploitable même nettoyé, ou prix plancher
 *  par devise (¥2 / $1 / 1€ — en dessous : acompte 定金, accessoire ou listing bidon). */
export function isQualityProduct(p: Product1688 | undefined): { ok: boolean; nameOk: boolean; priceOk: boolean; cleanedName?: string } {
  const cleanedName = cleanProductName(p?.name)
  const nameOk = cleanedName.length >= 5 && !/^Produit (1688|AliExpress|Alibaba)$/i.test(cleanedName)
  const minPrice = minSourcePrice(p?.price1688Currency)
  const priceOk = typeof p?.price1688 === 'number' && p.price1688 >= minPrice
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
    const result = await scrapeOneSource(url)
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
        console.log(`[sourcing] ignoré (qualité) — nom:«${d?.name?.slice(0, 40)}» prix:${d?.price1688} ${d?.price1688Currency || 'CNY'}`)
      }
    }
  }

  return { extracted, failed, blockedReason }
}

/** Prix suggéré = sourcing (CNY→FCFA) + marge + frais de service + assurance.
 *  Délègue à computeProductPricing — la même formule que le reste de la plateforme. */
function score(state: typeof SourcingState.State) {
  const scored = state.extracted.map((p) => {
    const platform = p.platform || '1688'
    const exchangeRate = p.exchangeRate > 0 ? p.exchangeRate : sourceCurrencyRate(p.price1688Currency)
    const baseCost = Math.round((p.price1688 || 0) * exchangeRate)
    const pricing = computeProductPricing({
      baseCost,
      marginRate: MARGIN_RATE,
      serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
      insuranceRate: DEFAULT_INSURANCE_RATE,
      price1688: p.price1688,
      exchangeRate,
      currency: 'FCFA',
      sourcing: { platform, supplierName: p.supplier?.name || '', supplierContact: '', productUrl: p.productUrl, notes: '' },
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
    const platform = p.platform || '1688'
    const platformLabel = PLATFORM_LABEL[platform]
    // Dédup par URL source — la convention existante (api/products/import)
    const exists = await Product.findOne({ 'sourcing.productUrl': p.productUrl }).select('_id').lean()
    if (exists) continue

    const specsMd = Object.entries(p.specifications || {})
      .slice(0, 12)
      .map(([k, v]) => `- **${k}** : ${v}`)
      .join('\n')
    const description = [
      p.description || p.tagline || `Produit sourcé sur ${platformLabel} — fournisseur ${p.supplier?.name || 'vérifié'}`,
      p.features?.length ? `\n\n**Points forts**\n${p.features.slice(0, 8).map(f => `- ${f}`).join('\n')}` : '',
      specsMd ? `\n\n**Caractéristiques**\n${specsMd}` : '',
      p.moq ? `\n\nQuantité min. fournisseur : ${p.moq} pcs` : '',
    ].filter(Boolean).join('\n').slice(0, 4000)

    const created = await Product.create({
      name: p.name.slice(0, 200),
      description,
      category: state.category || 'Import Chine',
      tagline: p.tagline || `Sourcé ${platformLabel}${p.supplier?.name ? ` • ${p.supplier.name}` : ''}`,
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
      availabilityNote: p.availabilityNote || `Import ${platformLabel} — délai à confirmer`,
      isPublished: false,
      price1688: p.price1688,
      price1688Currency: p.price1688Currency || 'CNY',
      exchangeRate: item.exchangeRate,
      serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
      insuranceRate: DEFAULT_INSURANCE_RATE,
      weightKg: p.weightKg || 1,
      lengthCm: p.lengthCm || 10,
      widthCm: p.widthCm || 10,
      heightCm: p.heightCm || 10,
      variantGroups: p.variantGroups || [],
      sourcing: {
        platform,
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
