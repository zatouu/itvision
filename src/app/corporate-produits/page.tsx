import { connectDB } from '@/lib/db'
import ProductValidated from '@/lib/models/Product.validated'
import CorporateCatalogClient from '@/components/corporate/CorporateCatalogClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Solutions & Équipements | IT Vision — Sécurité Électronique',
  description:
    "Équipements professionnels de sécurité électronique : vidéosurveillance, contrôle d'accès, alarme, réseau. Devis personnalisé, installation et maintenance au Sénégal.",
}

function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const SEARCH_TERMS = Array.from(new Set([
  'camera', 'caméra', 'videosurveillance', 'vidéosurveillance', 'cctv', 'hikvision', 'dahua', 'nvr', 'dvr',
  "contrôle d'accès", "controle d'acces", 'biométrique', 'badge', 'rfid', 'serrure',
  'alarme', 'alarm', 'détecteur', 'detecteur', 'sirène', 'intrusion', 'capteur',
  'réseau', 'reseau', 'wifi', 'wi-fi', 'switch', 'poe', 'routeur', 'câble', 'cable',
  'domotique', 'smart home', 'maison intelligente', 'automatisation', 'tuya', 'zigbee', 'sonoff',
  'gadget', 'accessoire', 'objet connecté', 'support', 'adaptateur',
  'incendie', 'fumée', 'fumee', 'extincteur', 'détection incendie',
]))

type StockStatus = 'in_stock' | 'preorder' | 'out_of_stock'

interface CorporateProduct {
  id: string
  name: string
  category: string
  description: string
  image?: string
  priceAmount?: number
  currency: string
  features: string[]
  stockStatus: StockStatus
  stockQuantity: number
  availabilityLabel: string
}

const FALLBACK_PRODUCTS: CorporateProduct[] = [
  {
    id: 'camera-ip',
    name: 'Caméras IP professionnelles',
    category: 'Vidéosurveillance',
    description: 'Solutions de surveillance HD pour bureaux, commerces, entrepôts et résidences. Vision nocturne, accès mobile et enregistrement sécurisé.',
    currency: 'FCFA',
    features: ['Vision nocturne', 'Accès mobile', 'Enregistrement local ou cloud', 'Installation incluse'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'controle-acces',
    name: "Contrôle d'accès biométrique",
    category: "Contrôle d'accès",
    description: 'Gestion sécurisée des entrées par empreinte digitale, badge RFID ou code PIN. Journal des passages et gestion multi-sites.',
    currency: 'FCFA',
    features: ['Empreinte / Badge / Code', 'Gestion utilisateurs', 'Journal des passages', 'Multi-sites'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'alarme-intrusion',
    name: "Système d'alarme intrusion",
    category: 'Alarme & détection',
    description: 'Protection périmétrique et volumétrique avec détecteurs, sirènes et alertes en temps réel sur mobile.',
    currency: 'FCFA',
    features: ['Détecteurs mouvement', 'Capteurs ouverture', 'Sirène', 'Alertes mobile'],
    stockStatus: 'in_stock',
    stockQuantity: 3,
    availabilityLabel: '3 en stock à Dakar',
  },
  {
    id: 'reseau-poe',
    name: 'Réseau & switches PoE',
    category: 'Réseau & connectivité',
    description: 'Infrastructure réseau fiable pour caméras IP, postes de travail et équipements Wi-Fi. Câblage structuré et baie réseau.',
    currency: 'FCFA',
    features: ['Switches PoE', 'Câblage structuré', 'Baie réseau', 'Tests débit'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'domotique',
    name: 'Domotique résidentielle',
    category: 'Domotique',
    description: 'Automatisation des éclairages, accès, climatisation et appareils connectés avec pilotage sur smartphone.',
    currency: 'FCFA',
    features: ['Scénarios intelligents', 'Pilotage mobile', 'Capteurs connectés', 'Automatisation éclairage'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
  {
    id: 'detection-incendie',
    name: 'Détection incendie',
    category: 'Sécurité incendie',
    description: "Détecteurs de fumée, signalisation d'alarme et dispositifs d'évacuation pour sites professionnels et ERP.",
    currency: 'FCFA',
    features: ['Détecteurs fumée', 'Signalisation sonore', 'Centrale selon besoin', 'Maintenance périodique'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
  },
]

function resolveCategory(doc: any): string | null {
  const CATS = [
    { label: 'Vidéosurveillance', terms: ['camera', 'caméra', 'videosurveillance', 'vidéosurveillance', 'cctv', 'hikvision', 'dahua', 'nvr', 'dvr'] },
    { label: "Contrôle d'accès", terms: ["contrôle d'accès", "controle d'acces", 'biométrique', 'badge', 'rfid', 'serrure', 'empreinte'] },
    { label: 'Alarme & détection', terms: ['alarme', 'alarm', 'détecteur', 'detecteur', 'sirène', 'intrusion', 'capteur'] },
    { label: 'Réseau & connectivité', terms: ['réseau', 'reseau', 'wifi', 'wi-fi', 'switch', 'poe', 'routeur', 'câble', 'cable'] },
    { label: 'Domotique', terms: ['domotique', 'smart home', 'maison intelligente', 'automatisation', 'tuya', 'zigbee', 'sonoff'] },
    { label: 'Gadgets & accessoires', terms: ['gadget', 'accessoire', 'objet connecté', 'support', 'adaptateur'] },
    { label: 'Sécurité incendie', terms: ['incendie', 'fumée', 'fumee', 'extincteur', 'détection incendie'] },
  ]
  const hay = normalizeStr(
    [doc.category, doc.name, doc.tagline, ...(Array.isArray(doc.tags) ? doc.tags : [])]
      .filter(Boolean)
      .join(' ')
  )
  for (const cat of CATS) {
    if (cat.terms.some((t) => hay.includes(t))) return cat.label
  }
  return null
}

function stockLabel(status: StockStatus, qty: number, leadTimeDays?: number): string {
  if (status === 'in_stock') return qty > 0 ? `${qty} en stock à Dakar` : 'Disponible à Dakar'
  if (status === 'out_of_stock') return 'Rupture temporaire'
  return leadTimeDays ? `Sur commande · ${leadTimeDays} j` : 'Sur commande'
}

async function fetchProducts(): Promise<CorporateProduct[]> {
  try {
    await connectDB()
    const regexes = SEARCH_TERMS.map((t) => new RegExp(escapeRegex(t), 'i'))
    const docs = await ProductValidated.find({
      isPublished: { $ne: false },
      $or: [
        { category: { $in: regexes } },
        { name: { $in: regexes } },
        { tagline: { $in: regexes } },
        { tags: { $in: regexes } },
      ],
    })
      .select('name category description tagline image price b2bPrice currency features stockStatus stockQuantity leadTimeDays isFeatured')
      .sort({ isFeatured: -1, category: 1, name: 1 })
      .limit(80)
      .lean()

    const mapped = docs
      .map((doc: any) => {
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
        const features: string[] = Array.isArray(doc.features)
          ? doc.features.filter(Boolean).slice(0, 4)
          : []
        return {
          id: String(doc._id),
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
        } as CorporateProduct
      })
      .filter((p): p is CorporateProduct => p !== null)

    return mapped.length > 0 ? mapped : FALLBACK_PRODUCTS
  } catch {
    return FALLBACK_PRODUCTS
  }
}

export default async function CorporateProduitsPage() {
  const products = await fetchProducts()
  return <CorporateCatalogClient products={products} />
}
