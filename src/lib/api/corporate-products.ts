import { CorporateProduct, FALLBACK_PRODUCTS, StockStatus } from '@/types/corporate-product'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const CATEGORIES = [
  { label: 'Vidéosurveillance', terms: ['camera', 'caméra', 'videosurveillance', 'vidéosurveillance', 'cctv', 'hikvision', 'dahua', 'nvr', 'dvr'] },
  { label: "Contrôle d'accès", terms: ["contrôle d'accès", "controle d'acces", 'biométrique', 'badge', 'rfid', 'serrure', 'empreinte'] },
  { label: 'Alarme & détection', terms: ['alarme', 'alarm', 'détecteur', 'detecteur', 'sirène', 'intrusion', 'capteur'] },
  { label: 'Réseau & connectivité', terms: ['réseau', 'reseau', 'wifi', 'wi-fi', 'switch', 'poe', 'routeur', 'câble', 'cable'] },
  { label: 'Domotique', terms: ['domotique', 'smart home', 'maison intelligente', 'automatisation', 'tuya', 'zigbee', 'sonoff'] },
  { label: 'Gadgets & accessoires', terms: ['gadget', 'accessoire', 'objet connecté', 'support', 'adaptateur'] },
  { label: 'Sécurité incendie', terms: ['incendie', 'fumée', 'fumee', 'extincteur', 'détection incendie'] },
]

function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function resolveCategory(doc: any): string | null {
  const hay = normalizeStr(
    [doc.category, doc.name, doc.tagline, ...(Array.isArray(doc.tags) ? doc.tags : [])]
      .filter(Boolean)
      .join(' ')
  )
  for (const cat of CATEGORIES) {
    if (cat.terms.some((t) => hay.includes(t))) return cat.label
  }
  return null
}

function stockLabel(status: StockStatus, qty: number, leadTimeDays?: number): string {
  if (status === 'in_stock') return qty > 0 ? `${qty} en stock à Dakar` : 'Disponible à Dakar'
  if (status === 'out_of_stock') return 'Rupture temporaire'
  return leadTimeDays ? `Sur commande · ${leadTimeDays} j` : 'Sur commande'
}

function mapApiItemToCorporateProduct(doc: any): CorporateProduct | null {
  const category = resolveCategory(doc)
  if (!category) return null

  const stockStatus: StockStatus =
    doc.stockStatus === 'in_stock' || doc.stockStatus === 'out_of_stock' ? doc.stockStatus : 'preorder'
  const stockQuantity: number = typeof doc.stockQuantity === 'number' ? doc.stockQuantity : 0
  const priceAmount: number | undefined =
    typeof doc.b2bPrice === 'number' && doc.b2bPrice > 0
      ? doc.b2bPrice
      : typeof doc.price === 'number' && doc.price > 0
        ? doc.price
        : undefined
  const features: string[] = Array.isArray(doc.features) ? doc.features.filter(Boolean).slice(0, 4) : []

  return {
    id: String(doc._id || doc.id),
    name: doc.name || 'Produit',
    category,
    description: stripHtml(doc.description || doc.tagline || ''),
    image: doc.image || undefined,
    priceAmount,
    currency: doc.currency || 'FCFA',
    features,
    stockStatus,
    stockQuantity,
    availabilityLabel: stockLabel(stockStatus, stockQuantity, doc.leadTimeDays),
  }
}

export interface CorporateProductsResponse {
  success: boolean
  products: CorporateProduct[]
  total: number
  error?: string
}

export async function fetchCorporateProductsFromApi(): Promise<CorporateProductsResponse> {
  try {
    const baseUrl = API_BASE_URL.replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/api/corporate/products?limit=80`, {
      next: { revalidate: 0 },
      cache: 'no-store',
    })
    if (!res.ok) {
      return { success: false, products: FALLBACK_PRODUCTS, total: 0, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    if (!data.success || !Array.isArray(data.items)) {
      return { success: false, products: FALLBACK_PRODUCTS, total: 0, error: data.error || 'Invalid response' }
    }
    const products = data.items.map(mapApiItemToCorporateProduct).filter((p: CorporateProduct | null): p is CorporateProduct => p !== null)
    return {
      success: true,
      products: products.length > 0 ? products : FALLBACK_PRODUCTS,
      total: data.total || 0,
    }
  } catch (e) {
    return { success: false, products: FALLBACK_PRODUCTS, total: 0, error: String(e) }
  }
}

