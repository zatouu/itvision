import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
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

const API_HOST = 'aliexpress-datahub.p.rapidapi.com'
const API_ENDPOINT = `https://${API_HOST}/item_search`

const FX_RATE = Number(process.env.ALIEXPRESS_USD_TO_XOF || 620)
const DEFAULT_MARGIN = Number(process.env.ALIEXPRESS_DEFAULT_MARGIN || 30)

function requireManagerRole(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    const role = String(decoded.role || '').toUpperCase()
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Token invalide' as const }
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

const fetchAliExpress = async (keyword: string, limit: number) => {
  // Détecter la source d'import (Apify ou RapidAPI)
  const importSource = (process.env.IMPORT_SOURCE || 'rapidapi').toLowerCase()
  const apifyKey = process.env.APIFY_API_KEY
  const rapidApiKey = process.env.ALIEXPRESS_RAPIDAPI_KEY

  // Essayer Apify si configuré, sinon RapidAPI
  if (importSource === 'apify' && apifyKey) {
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
    } catch (error: any) {
      console.error('Apify import error, falling back to RapidAPI:', error.message)
      // Fallback sur RapidAPI si Apify échoue
      if (!rapidApiKey) {
        throw new Error(`Apify a échoué et aucune clé RapidAPI disponible: ${error.message}`)
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
  const auth = requireManagerRole(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const keyword = (searchParams.get('keyword') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '6', 10), 12)
  if (!keyword) {
    return NextResponse.json({ success: false, error: 'Mot-clé requis' }, { status: 400 })
  }

  try {
    const items = await fetchAliExpress(keyword, limit)
    const normalized = items
      .map(normalizeAliExpressItem)
      .filter((item): item is NormalizedAliExpressItem => Boolean(item))

    return NextResponse.json({ success: true, items: normalized })
  } catch (error: any) {
    console.error('AliExpress search error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Import impossible' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireManagerRole(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  try {
    await connectMongoose()
    const body = await request.json()
    const item = body?.item as NormalizedAliExpressItem | undefined
    if (!item || !item.name || !item.productUrl) {
      return NextResponse.json({ success: false, error: 'Données import invalides' }, { status: 400 })
    }

    const payload = {
      name: item.name,
      category: item.category,
      description: `Import direct AliExpress • ${item.shopName || 'Fournisseur partenaire'}`,
      tagline: item.tagline,
      baseCost: item.baseCost,
      marginRate: DEFAULT_MARGIN,
      price: item.price,
      currency: item.currency,
      image: item.image,
      gallery: item.gallery,
      features: item.features,
      requiresQuote: typeof item.price === 'number' ? false : true,
      stockStatus: 'preorder' as const,
      stockQuantity: 0,
      leadTimeDays: 15,
      weightKg: item.weightKg,
      availabilityNote: item.availabilityNote,
      sourcing: {
        platform: 'aliexpress',
        supplierName: item.shopName,
        supplierContact: undefined,
        productUrl: item.productUrl,
        notes: item.sourcingNotes
      },
      shippingOverrides: []
    }

    const existing = await Product.findOne({ 'sourcing.productUrl': item.productUrl })
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

