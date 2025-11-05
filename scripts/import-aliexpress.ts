import 'dotenv/config'
import { argv } from 'process'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'

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
  first_level_category_id?: number
  second_level_category_name?: string
  second_level_category_id?: number
  total_rated?: number
  orders?: number
  item_weight?: number
}

interface AliExpressApiResponse {
  result?: {
    items?: AliExpressItem[]
  }
}

const API_HOST = 'aliexpress-datahub.p.rapidapi.com'
const API_ENDPOINT = `https://${API_HOST}/item_search`

const FX_RATE = Number(process.env.ALIEXPRESS_USD_TO_XOF || 620)
const DEFAULT_MARGIN = Number(process.env.ALIEXPRESS_DEFAULT_MARGIN || 30)

type CliOptions = {
  keyword: string
  limit: number
  pageSize: number
  dryRun: boolean
  verbose: boolean
}

const parseArgs = (): CliOptions => {
  const getValue = (flag: string, fallback?: string) => {
    const index = argv.findIndex((arg) => arg === flag)
    if (index === -1) return fallback
    return argv[index + 1]
  }

  const keyword = getValue('--keyword', 'hikvision') || 'hikvision'
  const limit = Number(getValue('--limit', '10')) || 10
  const pageSize = Number(getValue('--page-size', '20')) || 20
  const dryRun = argv.includes('--dry-run')
  const verbose = argv.includes('--verbose')

  return { keyword, limit, pageSize, dryRun, verbose }
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
  return 1 // poids minimum par défaut pour calcul transport
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

const fetchAliExpress = async (keyword: string, page: number): Promise<AliExpressItem[]> => {
  const apiKey = process.env.ALIEXPRESS_RAPIDAPI_KEY
  if (!apiKey) {
    throw new Error('ALIEXPRESS_RAPIDAPI_KEY est requis pour exécuter l\'import')
  }

  const query = new URLSearchParams({
    q: keyword,
    page: String(page),
    sort: 'orignalPriceDown'
  })

  const response = await fetch(`${API_ENDPOINT}?${query.toString()}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': API_HOST
    }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`AliExpress API error ${response.status}: ${body}`)
  }

  const json = (await response.json()) as AliExpressApiResponse
  const items = json.result?.items ?? []
  return items
}

const upsertProductFromItem = async (item: AliExpressItem, options: { dryRun: boolean; verbose: boolean }) => {
  const productUrl = item.product_detail_url || ''
  const title = item.product_title?.trim()
  const priceUSD = parsePriceUSD(item.sale_price || item.original_price || '')
  const baseCost = toFcfa(priceUSD)

  if (!title || !productUrl) {
    if (options.verbose) {
      console.warn('Produit ignoré (titre ou URL manquant):', item)
    }
    return { status: 'skipped' as const, reason: 'missing_title_url' }
  }

  const primaryImage = item.image_url || ''
  const weightKg = ensureMinimumWeight(item.item_weight)
  const features = extractFeatures(item)

  const payload = {
    name: title,
    category: item.first_level_category_name || 'Catalogue import Chine',
    description: `Import direct 1688/AliExpress • ${item.shop_name || item.store?.store_name || 'Fournisseur partenaire'}`,
    tagline: item.second_level_category_name || 'Solutions pro import Chine',
    baseCost: baseCost ?? undefined,
    marginRate: DEFAULT_MARGIN,
    price: baseCost ? Math.round(baseCost * (1 + DEFAULT_MARGIN / 100)) : undefined,
    currency: 'FCFA',
    image: primaryImage || undefined,
    gallery: primaryImage ? [primaryImage] : [],
    features,
    requiresQuote: baseCost ? false : true,
    stockStatus: 'preorder' as const,
    stockQuantity: 0,
    leadTimeDays: 15,
    weightKg,
    availabilityNote: 'Commande import Chine (freight 3j / 15j / 60j)',
    sourcing: {
      platform: 'aliexpress',
      supplierName: item.shop_name || item.store?.store_name || 'AliExpress Vendor',
      supplierContact: undefined,
      productUrl,
      notes: `Produit importé via API AliExpress.
ID: ${item.product_id || 'N/A'}
Commandes: ${item.orders ?? 'n/a'}`
    }
  }

  if (options.dryRun) {
    console.log('--- Aperçu produit (dry-run) ---')
    console.log({
      name: payload.name,
      baseCost: payload.baseCost,
      price: payload.price,
      weightKg: payload.weightKg,
      sourcingUrl: payload.sourcing.productUrl,
      features: payload.features
    })
    return { status: 'dry-run' as const }
  }

  const existing = await Product.findOne({ 'sourcing.productUrl': productUrl })

  if (existing) {
    await Product.updateOne({ _id: existing._id }, { $set: payload })
    if (options.verbose) {
      console.log(`Produit mis à jour: ${title}`)
    }
    return { status: 'updated' as const }
  }

  await Product.create(payload)
  if (options.verbose) {
    console.log(`Produit créé: ${title}`)
  }
  return { status: 'created' as const }
}

async function main() {
  const { keyword, limit, pageSize, dryRun, verbose } = parseArgs()
  const totalPages = Math.ceil(limit / pageSize)

  console.log(`Import AliExpress: mot-clé="${keyword}" limite=${limit} pageSize=${pageSize} dryRun=${dryRun}`)

  await connectMongoose()

  let processed = 0
  let created = 0
  let updated = 0
  let skipped = 0

  for (let page = 1; page <= totalPages; page++) {
    if (processed >= limit) break

    const items = await fetchAliExpress(keyword, page)
    if (items.length === 0) {
      if (verbose) console.log(`Aucun résultat page ${page}`)
      break
    }

    for (const item of items) {
      if (processed >= limit) break
      processed += 1
      const result = await upsertProductFromItem(item, { dryRun, verbose })
      if (result.status === 'created') created += 1
      else if (result.status === 'updated') updated += 1
      else if (result.status === 'dry-run') skipped += 1
      else skipped += 1
    }
  }

  console.log('--- Résumé import AliExpress ---')
  console.log(`Traités: ${processed}`)
  console.log(`Créés: ${created}`)
  console.log(`Mis à jour: ${updated}`)
  console.log(`Ignorés: ${skipped}`)

  if (!dryRun) {
    console.log('Import terminé. Pensez à vérifier les poids/dimensions pour un calcul transport précis.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Erreur import AliExpress:', err)
  process.exit(1)
})

