function isAliExpressUrl(rawUrl: string): boolean {
  const url = safeUrl(rawUrl)
  if (!url) return false
  const host = url.hostname.toLowerCase()
  return host.endsWith('aliexpress.com')
}

async function buildPreviewFromAliExpressUrl(rawUrl: string): Promise<NormalizedAliExpressItem> {
  const url = safeUrl(rawUrl)
  if (!url) throw new Error('URL invalide')
  if (!url.hostname.toLowerCase().endsWith('aliexpress.com')) {
    throw new Error('URL non supportée (attendu: aliexpress.com)')
  }

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ITVisionBot/1.0; +https://example.local)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    cache: 'no-store'
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Impossible de charger la page AliExpress (${res.status}). ${body ? body.slice(0, 120) : ''}`)
  }
  const html = await res.text()

  // Extraction titre
  let title = extractTitle(html)
  if (!title) {
    const m = html.match(/window.runParams = ([^;]+);/)
    if (m?.[1]) {
      try {
        const params = JSON.parse(m[1])
        title = params?.data?.titleModule?.subject || null
      } catch {}
    }
  }
  if (!title) title = 'Produit AliExpress'

  // Extraction images
  let images: string[] = []
  // 1. Essayer JSON-LD
  const jsonLd = extractJsonLdProduct(html)
  if (jsonLd.images?.length) images = jsonLd.images
  // 2. Regex sur les images
  if (!images.length) {
    const re = /(https?:\/\/ae\d+\.alicdn\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html))) {
      if (m[1]) images.push(m[1])
      if (images.length >= 10) break
    }
  }
  // 3. Fallback: og:image
  if (!images.length) {
    const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    if (og?.[1]) images.push(og[1])
  }
  images = [...new Set(images)].slice(0, 10)
  const image = images[0]

  // Extraction prix (très basique)
  let price: number | undefined
  const priceMatch = html.match(/"priceAmount":\s*([0-9.]+)/)
  if (priceMatch?.[1]) {
    const v = toFcfa(Number(priceMatch[1]))
    if (typeof v === 'number' && !isNaN(v)) price = v
  }
  if (typeof price !== 'number') {
    const m = html.match(/"salePrice":\s*\{[^}]*"value":\s*([0-9.]+)/)
    if (m?.[1]) {
      const v = toFcfa(Number(m[1]))
      if (typeof v === 'number' && !isNaN(v)) price = v
    }
  }

  // Extraction shop
  let shopName: string | undefined
  const shopMatch = html.match(/"storeName":\s*"([^"]+)"/)
  if (shopMatch?.[1]) shopName = shopMatch[1]

  // Features (vide par défaut)
  const features: string[] = []

  return {
    productId: undefined,
    name: title,
    productUrl: url.toString(),
    image,
    gallery: images,
    baseCost: price,
    price,
    currency: 'FCFA',
    weightKg: 1,
    features,
    category: 'Catalogue import Chine',
    tagline: 'Import AliExpress',
    availabilityNote: 'Import AliExpress — à vérifier: poids/dimensions avant calcul transport',
    shopName,
    orders: undefined,
    totalRated: undefined,
    sourcingNotes: 'Import auto AliExpress (HTML) — parsing sans API.'
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/jwt'

interface AliExpressItemProperty {
  attr_name?: string
  attr_value?: string
}

interface AliExpressItem {
  product_id?: string
  product_title?: string
  product_detail_url?: string
  image_url?: string
  original_price?: string
  sale_price?: string
  evaluation_score?: string
  shop_name?: string
  store?: {
    store_name?: string
  }
  product_properties?: AliExpressItemProperty[]
  first_level_category_name?: string
  second_level_category_name?: string
  total_rated?: number
  orders?: number
  item_weight?: number
}

interface AliExpressApiResponse {
  result?: {
    items?: AliExpressItem[]
  }
}

interface NormalizedAliExpressItem {
  productId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  baseCost?: number
  price?: number
  currency: string
  weightKg?: number
  features: string[]
  category: string
  tagline: string
  availabilityNote: string
  shopName?: string
  orders?: number
  totalRated?: number
  sourcingNotes?: string
}

type Import1688Preview = {
  offerId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  price1688?: number
  price1688Currency?: 'CNY'
  exchangeRate?: number
  currency?: 'FCFA'
  category: string
  tagline: string
  availabilityNote: string
  features: string[]
  // Minimal logistics to satisfy Product.validated rules for imported items
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  variantGroups?: Array<{
    name: string
    variants: Array<{
      id: string
      name: string
      image?: string
      price1688?: number
      stock?: number
      isDefault?: boolean
    }>
  }>
}

const API_HOST = 'aliexpress-datahub.p.rapidapi.com'
const API_ENDPOINT = `https://${API_HOST}/item_search`

const FX_RATE = Number(process.env.ALIEXPRESS_USD_TO_XOF || 620)
const DEFAULT_MARGIN = Number(process.env.ALIEXPRESS_DEFAULT_MARGIN || 0)  // Marge par défaut à 0%

async function requireManagerRole(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

const parsePriceUSD = (input?: string): number | null => {
  if (!input) return null
  const numericValue = Number(input.replace(/[^0-9.,]/g, '').replace(',', '.'))
  if (Number.isNaN(numericValue) || !Number.isFinite(numericValue)) return null
  return numericValue
}

const toFcfa = (usdPrice: number | null) => {
  if (usdPrice === null) return null
  return Math.round(usdPrice * FX_RATE)
}

const ensureMinimumWeight = (weight?: number | null) => {
  if (typeof weight === 'number' && weight > 0) return Number(weight.toFixed(2))
  return 1
}

function safeUrl(raw: string) {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

function is1688Url(rawUrl: string): boolean {
  const url = safeUrl(rawUrl)
  if (!url) return false
  const host = url.hostname.toLowerCase()
  return host.endsWith('1688.com')
}

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function extractOfferId(url: URL): string | undefined {
  const fromQuery = url.searchParams.get('offerId') || url.searchParams.get('offerid')
  if (fromQuery && /^\d{6,}$/.test(fromQuery)) return fromQuery
  const m = url.pathname.match(/offer\/(\d{6,})\.html/i)
  if (m?.[1]) return m[1]
  return undefined
}

function extractTitle(html: string): string | null {
  const og = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
  if (og?.[1]) return decodeHtml(og[1]).trim()
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (title?.[1]) {
    const cleaned = decodeHtml(title[1]).replace(/\s*[-|].*$/, '').trim()
    return cleaned || null
  }
  return null
}

function extractJsonLdProduct(html: string): { name?: string; images?: string[]; price?: number } {
  const blocks: string[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m?.[1]) blocks.push(m[1])
    if (blocks.length >= 5) break
  }

  const findProduct = (value: any): any => {
    if (!value) return null
    if (Array.isArray(value)) {
      for (const v of value) {
        const found = findProduct(v)
        if (found) return found
      }
      return null
    }
    if (typeof value === 'object') {
      const type = value['@type']
      const types = Array.isArray(type) ? type.map(String) : type ? [String(type)] : []
      if (types.some(t => t.toLowerCase() === 'product')) return value
      if (value['@graph']) {
        const found = findProduct(value['@graph'])
        if (found) return found
      }
      return null
    }
    return null
  }

  for (const raw of blocks) {
    try {
      const parsed = JSON.parse(raw.trim())
      const product = findProduct(parsed)
      if (!product) continue

      const name = typeof product.name === 'string' ? product.name.trim() : undefined

      const imageRaw = product.image
      const images = Array.isArray(imageRaw)
        ? imageRaw.filter((v: any) => typeof v === 'string')
        : typeof imageRaw === 'string'
          ? [imageRaw]
          : undefined

      const offers = product.offers
      const priceRaw = offers && typeof offers === 'object' ? (offers.price ?? offers.lowPrice ?? offers.highPrice) : undefined
      const price = priceRaw !== undefined ? Number(priceRaw) : undefined

      return {
        name,
        images,
        price: Number.isFinite(price) && price && price > 0 ? price : undefined
      }
    } catch {
      // ignore JSON-LD parse errors
    }
  }

  return {}
}

function extractPrice1688(html: string): number | undefined {
  const patterns = [
    /价格\s*¥\s*([0-9]+(?:\.[0-9]+)?)/,
    /¥\s*([0-9]+(?:\.[0-9]+)?)\s*起/,
    /\bprice\b[^0-9]{0,12}([0-9]+(?:\.[0-9]+)?)/i
  ]

  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) {
      const v = Number(m[1])
      if (Number.isFinite(v) && v > 0) return v
    }
  }
  return undefined
}

function extractImages(html: string): string[] {
  const urls = new Set<string>()
  const re = /(https?:\/\/(?:cbu\d{2}\.alicdn\.com|gw\.alicdn\.com|img\.alicdn\.com)\/[\s\S]*?\.(?:jpg|jpeg|png|webp))(?:_[^\s"'<>]+)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const u = m[1]
    if (!u) continue
    urls.add(u)
    if (urls.size >= 20) break
  }
  return Array.from(urls)
}

function extractVariantNamesFromText(html: string): string[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

  const names = new Set<string>()
  const re = /(k\d{1,3}[^\s]{0,18}?)(?:库存|\s*stock)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const n = m[1]?.trim()
    if (!n) continue
    if (n.length < 3 || n.length > 32) continue
    names.add(n)
    if (names.size >= 30) break
  }
  return Array.from(names)
}

async function buildPreviewFrom1688Url(rawUrl: string): Promise<Import1688Preview> {
  const url = safeUrl(rawUrl)
  if (!url) throw new Error('URL invalide')
  if (!url.hostname.toLowerCase().endsWith('1688.com')) {
    throw new Error('URL non supportée (attendu: 1688.com)')
  }

  const offerId = extractOfferId(url)
  const res = await fetch(url.toString(), {
    headers: {
      // User-Agent d’un vrai navigateur récent (Windows/Chrome)
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    },
    cache: 'no-store'
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Impossible de charger la page 1688 (${res.status}). ${body ? body.slice(0, 120) : ''}`)
  }

  const html = await res.text()
  // Détection blocage/captcha : page très courte ou contient "robot check"
  if (!html || html.length < 1000 || /robot|verify|captcha|window.location/i.test(html)) {
    throw new Error(
      "CAPTCHA_1688: Le site 1688 a bloqué l’accès automatisé (captcha / anti-bot). " +
        "Solutions: 1) réessayer plus tard, 2) changer d’IP (4G/VPN), " +
        "3) faire un import manuel (coller nom + images dans l’admin) en gardant le lien 1688 dans \"Sourcing\"."
    )
  }

  const jsonLd = extractJsonLdProduct(html)
  const title = (typeof jsonLd.name === 'string' && jsonLd.name.trim()) || extractTitle(html)
  if (!title || /1688|robot|verify|captcha/i.test(title)) {
    throw new Error('Impossible d’extraire le titre du produit. Le scraping est probablement bloqué par 1688 (captcha ou page protégée).')
  }

  const images = [...new Set([...(jsonLd.images || []), ...extractImages(html)])]
  const price1688 = jsonLd.price ?? extractPrice1688(html)

  const variantNames = extractVariantNamesFromText(html)
  const variantGroups = variantNames.length
    ? [
        {
          name: 'Modèle',
          variants: variantNames.slice(0, 25).map((name, idx) => ({
            id: randomUUID(),
            name,
            image: images[idx + 1] || images[0],
            price1688,
            stock: undefined,
            isDefault: idx === 0
          }))
        }
      ]
    : undefined

  const gallery = images.slice(0, 10)
  const image = gallery[0]

  // Defaults chosen to satisfy import logistics validation; admin should adjust.
  const weightKg = 1
  const lengthCm = 10
  const widthCm = 10
  const heightCm = 10

  const features: string[] = []
  if (offerId) features.push(`1688 offerId: ${offerId}`)
  if (typeof price1688 === 'number') features.push(`Prix 1688 (min): ¥${price1688}`)
  if (variantNames.length) {
    features.push(`Variantes: ${variantNames.slice(0, 4).join(' / ')}${variantNames.length > 4 ? '…' : ''}`)
  }

  return {
    offerId,
    name: title,
    productUrl: url.toString(),
    image,
    gallery,
    price1688,
    price1688Currency: 'CNY',
    exchangeRate: 100,
    currency: 'FCFA',
    category: 'Catalogue import Chine',
    tagline: 'Import 1688',
    availabilityNote: 'Import 1688 — à vérifier: poids/dimensions avant calcul transport',
    features,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    variantGroups
  }
}

const extractFeatures = (item: AliExpressItem): string[] => {
  const features = new Set<string>()
  if (item.shop_name) features.add(`Boutique: ${item.shop_name}`)
  if (item.orders) features.add(`${item.orders} commandes`)
  if (item.total_rated) features.add(`${item.total_rated} avis`)
  if (Array.isArray(item.product_properties)) {
    item.product_properties
      .filter((prop): prop is AliExpressItemProperty => Boolean(prop?.attr_name && prop?.attr_value))
      .slice(0, 5)
      .forEach((prop) => {
        features.add(`${prop.attr_name}: ${prop.attr_value}`)
      })
  }
  return [...features].slice(0, 6)
}

const fetchAliExpress = async (keyword: string, limit: number, sourceOverride?: 'apify' | 'rapidapi') => {
  // Détecter la source d'import (Apify ou RapidAPI)
  const importSource = (sourceOverride || process.env.IMPORT_SOURCE || 'rapidapi').toLowerCase()
  const apifyKey = process.env.APIFY_API_KEY || process.env.APIFY_TOKEN
  const rapidApiKey = process.env.ALIEXPRESS_RAPIDAPI_KEY

  // Essayer Apify si configuré, sinon RapidAPI
  if (importSource === 'apify') {
    if (!apifyKey) {
      throw new Error('APIFY_API_KEY (ou APIFY_TOKEN) est requis pour utiliser Apify')
    }
    try {
      const { importFromApify } = await import('@/lib/import-sources')
      const result = await importFromApify(keyword, limit, {
        source: 'apify',
        apiKey: apifyKey,
        options: {}
      })
      // Convertir les résultats au format attendu
      return result.items.map(item => ({
        product_id: item.productId,
        product_title: item.name,
        product_detail_url: item.productUrl,
        image_url: item.image,
        sale_price: item.baseCost ? String(item.baseCost / 620) : undefined, // Convertir FCFA -> USD pour compatibilité
        original_price: item.baseCost ? String(item.baseCost / 620) : undefined,
        shop_name: item.shopName,
        orders: item.orders,
        total_rated: item.totalRated,
        item_weight: item.weightKg,
        first_level_category_name: item.category,
        second_level_category_name: item.tagline,
        product_properties: item.features.map(f => ({
          attr_name: f.split(':')[0] || 'Feature',
          attr_value: f.split(':').slice(1).join(':') || f
        }))
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur Apify'
      console.error('Apify import error, falling back to RapidAPI:', message)
      // Fallback sur RapidAPI si Apify échoue
      if (!rapidApiKey) {
        throw new Error(`Apify a échoué et aucune clé RapidAPI disponible: ${message}`)
      }
    }
  }

  // Utiliser RapidAPI (par défaut ou fallback)
  if (!rapidApiKey) {
    throw new Error('ALIEXPRESS_RAPIDAPI_KEY ou APIFY_API_KEY est requis pour l\'import AliExpress')
  }

  const pageSize = Math.min(Math.max(limit, 1), 20)
  const query = new URLSearchParams({
    q: keyword,
    page: '1',
    page_size: String(pageSize),
    sort: 'orignalPriceDown'
  })

  const response = await fetch(`${API_ENDPOINT}?${query.toString()}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': API_HOST
    }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`AliExpress API error ${response.status}: ${body}`)
  }

  const json = (await response.json()) as AliExpressApiResponse
  return json.result?.items ?? []
}

const normalizeAliExpressItem = (item: AliExpressItem): NormalizedAliExpressItem | null => {
  const productUrl = item.product_detail_url || ''
  const title = item.product_title?.trim()
  if (!title || !productUrl) return null

  const priceUSD = parsePriceUSD(item.sale_price || item.original_price || '')
  const baseCost = toFcfa(priceUSD) ?? undefined
  const price = typeof baseCost === 'number' ? Math.round(baseCost * (1 + DEFAULT_MARGIN / 100)) : undefined
  const primaryImage = item.image_url || ''
  const weightKg = ensureMinimumWeight(item.item_weight)
  const features = extractFeatures(item)

  const availabilityNote = 'Commande import Chine (freight 3j / 15j / 60j)'

  return {
    productId: item.product_id,
    name: title,
    productUrl,
    image: primaryImage || undefined,
    gallery: primaryImage ? [primaryImage] : [],
    baseCost,
    price,
    currency: 'FCFA',
    weightKg,
    features,
    category: item.first_level_category_name || 'Catalogue import Chine',
    tagline: item.second_level_category_name || 'Solutions import Chine',
    availabilityNote,
    shopName: item.shop_name || item.store?.store_name,
    orders: item.orders,
    totalRated: item.total_rated,
    sourcingNotes: `Produit importé via API AliExpress.
ID: ${item.product_id || 'N/A'}
Commandes: ${item.orders ?? 'n/a'}
Avis: ${item.total_rated ?? 'n/a'}`
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireManagerRole(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const rawUrl = (searchParams.get('url') || '').trim()
  if (rawUrl) {
    try {
      if (is1688Url(rawUrl)) {
        const preview = await buildPreviewFrom1688Url(rawUrl)
        return NextResponse.json({ success: true, item: preview })
      } else if (isAliExpressUrl(rawUrl)) {
        const preview = await buildPreviewFromAliExpressUrl(rawUrl)
        return NextResponse.json({ success: true, item: preview })
      } else {
        return NextResponse.json({ success: false, error: 'URL non supportée' }, { status: 400 })
      }
    } catch (error: any) {
      console.error('Preview error:', error)
      const message = String(error?.message || 'Import impossible')
      const isCaptcha = /CAPTCHA_1688|captcha|robot|verify/i.test(message)
      const code = isCaptcha ? 'CAPTCHA' : 'PREVIEW_FAILED'
      const status = isCaptcha ? 502 : 500
      return NextResponse.json({ success: false, error: message.replace(/^CAPTCHA_1688:\s*/i, ''), code }, { status })
    }
  }

  const keyword = (searchParams.get('keyword') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '6', 10), 12)
  const sourceParam = (searchParams.get('source') || '').toLowerCase()
  const sourceOverride = sourceParam === 'apify' || sourceParam === 'rapidapi' ? (sourceParam as 'apify' | 'rapidapi') : undefined
  if (!keyword) {
    return NextResponse.json({ success: false, error: 'Mot-clé requis' }, { status: 400 })
  }

  try {
    const items = await fetchAliExpress(keyword, limit, sourceOverride)
    const normalized = items
      .map(normalizeAliExpressItem)
      .filter((item): item is NormalizedAliExpressItem => Boolean(item))

    return NextResponse.json({ success: true, items: normalized })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import impossible'
    console.error('AliExpress search error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireManagerRole(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  try {
    await connectMongoose()
    const body = await request.json()

    // Bulk import: body.urls = string[]
    const rawUrls = Array.isArray(body?.urls) ? (body.urls as unknown[]) : null
    const dryRun = Boolean(body?.dryRun)
    if (rawUrls) {
      const urls = Array.from(
        new Set(
          rawUrls
            .filter((v): v is string => typeof v === 'string')
            .map(u => u.trim())
            .filter(u => u.length > 0)
        )
      ).slice(0, 20)

      if (urls.length === 0) {
        return NextResponse.json({ success: false, error: 'Aucune URL valide fournie' }, { status: 400 })
      }

      type BulkImportResult = {
        url: string
        ok: boolean
        action?: 'created' | 'updated' | 'preview'
        productId?: string
        error?: string
      }

      const results: BulkImportResult[] = []
      let createdCount = 0
      let updatedCount = 0
      let failedCount = 0

      for (const url of urls) {
        try {
          let preview: NormalizedAliExpressItem | Import1688Preview
          if (is1688Url(url)) {
            preview = await buildPreviewFrom1688Url(url)
          } else if (isAliExpressUrl(url)) {
            preview = await buildPreviewFromAliExpressUrl(url)
          } else {
            throw new Error('URL non supportée (sources: aliexpress.com, 1688.com)')
          }

          if (dryRun) {
            results.push({ url, ok: true, action: 'preview' })
            continue
          }

          if (is1688Url(preview.productUrl)) {
            const item1688 = preview as Import1688Preview
            const payload: any = {
              name: item1688.name,
              category: item1688.category || 'Catalogue import Chine',
              tagline: item1688.tagline || 'Import 1688',
              description: item1688.offerId
                ? `Import depuis 1688 • offerId ${item1688.offerId}`
                : 'Import depuis 1688',
              currency: 'FCFA',
              image: item1688.image,
              gallery: Array.isArray(item1688.gallery) ? item1688.gallery : [],
              features: Array.isArray(item1688.features) ? item1688.features : [],
              requiresQuote: false,
              stockStatus: 'preorder' as const,
              stockQuantity: 0,
              leadTimeDays: 15,
              availabilityNote: item1688.availabilityNote,
              // 1688
              price1688: typeof item1688.price1688 === 'number' ? item1688.price1688 : undefined,
              price1688Currency: 'CNY',
              exchangeRate: typeof item1688.exchangeRate === 'number' && item1688.exchangeRate > 0 ? item1688.exchangeRate : 100,
              serviceFeeRate: 10,
              insuranceRate: 2.5,
              // Logistics placeholders (required for imported items)
              weightKg: Number(item1688.weightKg) || 1,
              lengthCm: Number(item1688.lengthCm) || 10,
              widthCm: Number(item1688.widthCm) || 10,
              heightCm: Number(item1688.heightCm) || 10,
              // Variants
              variantGroups: Array.isArray(item1688.variantGroups) ? item1688.variantGroups : [],
              // Sourcing
              sourcing: {
                platform: '1688',
                supplierName: undefined,
                supplierContact: undefined,
                productUrl: item1688.productUrl,
                notes: `Import auto 1688${item1688.offerId ? ` (offerId ${item1688.offerId})` : ''}. Vérifier poids/dimensions.`
              },
              shippingOverrides: []
            }

            const existing = await Product.findOne({ 'sourcing.productUrl': item1688.productUrl })
            if (existing) {
              await Product.updateOne({ _id: existing._id }, { $set: payload })
              updatedCount++
              results.push({ url, ok: true, action: 'updated', productId: String(existing._id) })
              continue
            }

            const created = await Product.create(payload)
            createdCount++
            results.push({ url, ok: true, action: 'created', productId: String(created._id) })
            continue
          }

          const ali = preview as NormalizedAliExpressItem
          const payload = {
            name: ali.name,
            category: ali.category,
            description: `Import direct AliExpress • ${ali.shopName || 'Fournisseur partenaire'}`,
            tagline: ali.tagline,
            baseCost: ali.baseCost,
            marginRate: DEFAULT_MARGIN,
            price: ali.price,
            currency: ali.currency,
            image: ali.image,
            gallery: ali.gallery,
            features: ali.features,
            requiresQuote: typeof ali.price === 'number' ? false : true,
            stockStatus: 'preorder' as const,
            stockQuantity: 0,
            leadTimeDays: 15,
            weightKg: ali.weightKg,
            availabilityNote: ali.availabilityNote,
            sourcing: {
              platform: 'aliexpress',
              supplierName: ali.shopName,
              supplierContact: undefined,
              productUrl: ali.productUrl,
              notes: ali.sourcingNotes
            },
            shippingOverrides: []
          }

          const existing = await Product.findOne({ 'sourcing.productUrl': ali.productUrl })
          if (existing) {
            await Product.updateOne({ _id: existing._id }, { $set: payload })
            updatedCount++
            results.push({ url, ok: true, action: 'updated', productId: String(existing._id) })
            continue
          }

          const created = await Product.create(payload)
          createdCount++
          results.push({ url, ok: true, action: 'created', productId: String(created._id) })
        } catch (error: any) {
          failedCount++
          results.push({ url, ok: false, error: error?.message || 'Import impossible' })
        }
      }

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: urls.length,
          created: createdCount,
          updated: updatedCount,
          failed: failedCount,
          dryRun
        }
      })
    }

    // Bulk import from already-normalized items: body.items = Array<{ name, productUrl, ... }>
    const rawItems = Array.isArray(body?.items) ? (body.items as unknown[]) : null
    if (rawItems) {
      const items = Array.from(
        new Set(
          rawItems
            .filter((v): v is NormalizedAliExpressItem | Import1688Preview =>
              typeof v === 'object' && v !== null && 'productUrl' in v
            )
            .map(v => v as NormalizedAliExpressItem | Import1688Preview)
            .filter(v => typeof v.productUrl === 'string')
            .map(v => ({ ...v, productUrl: String(v.productUrl).trim() }))
            .filter(v => v.productUrl.length > 0)
            .map(v => v.productUrl)
        )
      )

      const uniqueByUrl = new Map<string, NormalizedAliExpressItem | Import1688Preview>()
      for (const v of rawItems) {
        if (typeof v !== 'object' || v === null) continue
        const candidate = v as NormalizedAliExpressItem | Import1688Preview
        const url = typeof candidate.productUrl === 'string' ? candidate.productUrl.trim() : ''
        if (!url) continue
        uniqueByUrl.set(url, { ...candidate, productUrl: url })
      }

      const normalizedItems = Array.from(uniqueByUrl.values()).slice(0, 20)
      if (normalizedItems.length === 0) {
        return NextResponse.json({ success: false, error: 'Aucun item valide fourni' }, { status: 400 })
      }

      type BulkItemResult = {
        productUrl: string
        ok: boolean
        action?: 'created' | 'updated' | 'preview'
        productId?: string
        error?: string
      }

      const dryRun = Boolean(body?.dryRun)
      const results: BulkItemResult[] = []
      let createdCount = 0
      let updatedCount = 0
      let failedCount = 0

      for (const it of normalizedItems) {
        const productUrl = it.productUrl
        try {
          if (!it.name || !productUrl) {
            throw new Error('Données import invalides')
          }

          if (dryRun) {
            results.push({ productUrl, ok: true, action: 'preview' })
            continue
          }

          if (is1688Url(productUrl)) {
            const preview = it as Import1688Preview
            const payload: Record<string, unknown> = {
              name: preview.name,
              category: preview.category || 'Catalogue import Chine',
              tagline: preview.tagline || 'Import 1688',
              description: preview.offerId
                ? `Import depuis 1688 • offerId ${preview.offerId}`
                : 'Import depuis 1688',
              currency: 'FCFA',
              image: preview.image,
              gallery: Array.isArray(preview.gallery) ? preview.gallery : [],
              features: Array.isArray(preview.features) ? preview.features : [],
              requiresQuote: false,
              stockStatus: 'preorder',
              stockQuantity: 0,
              leadTimeDays: 15,
              availabilityNote: preview.availabilityNote,
              // 1688
              price1688: typeof preview.price1688 === 'number' ? preview.price1688 : undefined,
              price1688Currency: 'CNY',
              exchangeRate: typeof preview.exchangeRate === 'number' && preview.exchangeRate > 0 ? preview.exchangeRate : 100,
              serviceFeeRate: 10,
              insuranceRate: 2.5,
              // Logistics placeholders (required for imported items)
              weightKg: Number(preview.weightKg) || 1,
              lengthCm: Number(preview.lengthCm) || 10,
              widthCm: Number(preview.widthCm) || 10,
              heightCm: Number(preview.heightCm) || 10,
              // Variants
              variantGroups: Array.isArray(preview.variantGroups) ? preview.variantGroups : [],
              // Sourcing
              sourcing: {
                platform: '1688',
                supplierName: undefined,
                supplierContact: undefined,
                productUrl: preview.productUrl,
                notes: `Import auto 1688${preview.offerId ? ` (offerId ${preview.offerId})` : ''}. Vérifier poids/dimensions.`
              },
              shippingOverrides: []
            }

            const existing = await Product.findOne({ 'sourcing.productUrl': preview.productUrl })
            if (existing) {
              await Product.updateOne({ _id: existing._id }, { $set: payload })
              updatedCount++
              results.push({ productUrl, ok: true, action: 'updated', productId: String(existing._id) })
              continue
            }

            const created = await Product.create(payload)
            createdCount++
            results.push({ productUrl, ok: true, action: 'created', productId: String(created._id) })
            continue
          }

          const ali = it as NormalizedAliExpressItem
          const payload = {
            name: ali.name,
            category: ali.category,
            description: `Import direct AliExpress • ${ali.shopName || 'Fournisseur partenaire'}`,
            tagline: ali.tagline,
            baseCost: ali.baseCost,
            marginRate: DEFAULT_MARGIN,
            price: ali.price,
            currency: ali.currency,
            image: ali.image,
            gallery: ali.gallery,
            features: ali.features,
            requiresQuote: typeof ali.price === 'number' ? false : true,
            stockStatus: 'preorder' as const,
            stockQuantity: 0,
            leadTimeDays: 15,
            weightKg: ali.weightKg,
            availabilityNote: ali.availabilityNote,
            sourcing: {
              platform: 'aliexpress',
              supplierName: ali.shopName,
              supplierContact: undefined,
              productUrl: ali.productUrl,
              notes: ali.sourcingNotes
            },
            shippingOverrides: []
          }

          const existing = await Product.findOne({ 'sourcing.productUrl': ali.productUrl })
          if (existing) {
            await Product.updateOne({ _id: existing._id }, { $set: payload })
            updatedCount++
            results.push({ productUrl, ok: true, action: 'updated', productId: String(existing._id) })
            continue
          }

          const created = await Product.create(payload)
          createdCount++
          results.push({ productUrl, ok: true, action: 'created', productId: String(created._id) })
        } catch (error) {
          failedCount++
          const message = error instanceof Error ? error.message : 'Import impossible'
          results.push({ productUrl, ok: false, error: message })
        }
      }

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: normalizedItems.length,
          created: createdCount,
          updated: updatedCount,
          failed: failedCount,
          dryRun
        }
      })
    }

    const item = body?.item as (NormalizedAliExpressItem | Import1688Preview) | undefined
    if (!item || !item.name || !item.productUrl) {
      return NextResponse.json({ success: false, error: 'Données import invalides' }, { status: 400 })
    }

    if (is1688Url(item.productUrl)) {
      const preview = item as Import1688Preview
      const payload: any = {
        name: preview.name,
        category: preview.category || 'Catalogue import Chine',
        tagline: preview.tagline || 'Import 1688',
        description: preview.offerId
          ? `Import depuis 1688 • offerId ${preview.offerId}`
          : 'Import depuis 1688',
        currency: 'FCFA',
        image: preview.image,
        gallery: Array.isArray(preview.gallery) ? preview.gallery : [],
        features: Array.isArray(preview.features) ? preview.features : [],
        requiresQuote: false,
        stockStatus: 'preorder' as const,
        stockQuantity: 0,
        leadTimeDays: 15,
        availabilityNote: preview.availabilityNote,
        // 1688
        price1688: typeof preview.price1688 === 'number' ? preview.price1688 : undefined,
        price1688Currency: 'CNY',
        exchangeRate: typeof preview.exchangeRate === 'number' && preview.exchangeRate > 0 ? preview.exchangeRate : 100,
        serviceFeeRate: 10,
        insuranceRate: 2.5,
        // Logistics placeholders (required for imported items)
        weightKg: Number(preview.weightKg) || 1,
        lengthCm: Number(preview.lengthCm) || 10,
        widthCm: Number(preview.widthCm) || 10,
        heightCm: Number(preview.heightCm) || 10,
        // Variants
        variantGroups: Array.isArray(preview.variantGroups) ? preview.variantGroups : [],
        // Sourcing
        sourcing: {
          platform: '1688',
          supplierName: undefined,
          supplierContact: undefined,
          productUrl: preview.productUrl,
          notes: `Import auto 1688${preview.offerId ? ` (offerId ${preview.offerId})` : ''}. Vérifier poids/dimensions.`
        },
        shippingOverrides: []
      }

      const existing = await Product.findOne({ 'sourcing.productUrl': preview.productUrl })
      if (existing) {
        await Product.updateOne({ _id: existing._id }, { $set: payload })
        const updated = await Product.findById(existing._id).lean()
        return NextResponse.json({ success: true, product: updated, action: 'updated' })
      }

      const created = await Product.create(payload)
      return NextResponse.json({ success: true, product: created.toObject(), action: 'created' }, { status: 201 })
    }

    const ali = item as NormalizedAliExpressItem
    const payload = {
      name: ali.name,
      category: ali.category,
      description: `Import direct AliExpress • ${ali.shopName || 'Fournisseur partenaire'}`,
      tagline: ali.tagline,
      baseCost: ali.baseCost,
      marginRate: DEFAULT_MARGIN,
      price: ali.price,
      currency: ali.currency,
      image: ali.image,
      gallery: ali.gallery,
      features: ali.features,
      requiresQuote: typeof ali.price === 'number' ? false : true,
      stockStatus: 'preorder' as const,
      stockQuantity: 0,
      leadTimeDays: 15,
      weightKg: ali.weightKg,
      availabilityNote: ali.availabilityNote,
      sourcing: {
        platform: 'aliexpress',
        supplierName: ali.shopName,
        supplierContact: undefined,
        productUrl: ali.productUrl,
        notes: ali.sourcingNotes
      },
      shippingOverrides: []
    }

    const existing = await Product.findOne({ 'sourcing.productUrl': ali.productUrl })
    if (existing) {
      await Product.updateOne({ _id: existing._id }, { $set: payload })
      const updated = await Product.findById(existing._id).lean()
      return NextResponse.json({ success: true, product: updated, action: 'updated' })
    }

    const created = await Product.create(payload)
    return NextResponse.json({ success: true, product: created.toObject(), action: 'created' }, { status: 201 })
  } catch (error: any) {
    console.error('AliExpress import error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Import impossible' }, { status: 500 })
  }
}

