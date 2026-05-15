import Link from 'next/link'
import Image from 'next/image'
import { connectDB } from '@/lib/db'
import ProductValidated from '@/lib/models/Product.validated'
import {
  Camera, Shield, Lock, Wifi, Bell, Cpu, Sparkles, PackageCheck,
  ArrowRight, Phone, Mail, CheckCircle, BadgeCheck, Clock3, MapPin, Wrench
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CorporateProduct {
  id: string
  name: string
  category: string
  tagline?: string
  description: string
  image?: string
  priceAmount?: number
  currency: string
  features: string[]
  detailPoints: string[]
  serviceInclusions: string[]
  useCases: string[]
  stockStatus: 'in_stock' | 'preorder' | 'out_of_stock'
  stockQuantity: number
  availabilityLabel: string
  deliveryLabel: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CATEGORY_DEFINITIONS: Array<{
  label: string
  icon: LucideIcon
  aliases: string[]
  keywords: string[]
}> = [
  {
    label: 'Vidéosurveillance',
    icon: Camera,
    aliases: ['Vidéosurveillance', 'Camera', 'Caméra', 'Cameras', 'Caméras', 'CCTV'],
    keywords: ['camera', 'caméra', 'cameras', 'caméras', 'videosurveillance', 'vidéosurveillance', 'cctv', 'hikvision', 'dahua', 'nvr', 'dvr']
  },
  {
    label: "Contrôle d'accès",
    icon: Lock,
    aliases: ["Contrôle d'Accès", "Contrôle d'accès", 'Controle acces', 'Access Control', 'Biométrie'],
    keywords: ['contrôle', 'controle', 'access', 'accès', 'acces', 'biométrique', 'biometrique', 'badge', 'rfid', 'serrure']
  },
  {
    label: 'Alarme & détection',
    icon: Bell,
    aliases: ['Alarme', 'Alarmes', 'Détection', 'Detection'],
    keywords: ['alarme', 'alarm', 'détecteur', 'detecteur', 'sirène', 'sirene', 'intrusion', 'capteur']
  },
  {
    label: 'Réseau & connectivité',
    icon: Wifi,
    aliases: ['Réseau', 'Reseau', 'Wifi', 'Wi-Fi', 'Switch', 'PoE'],
    keywords: ['réseau', 'reseau', 'wifi', 'wi-fi', 'switch', 'poe', 'routeur', 'router', 'câble', 'cable', 'connectique']
  },
  {
    label: 'Domotique',
    icon: Cpu,
    aliases: ['Domotique', 'Smart Home', 'Maison intelligente'],
    keywords: ['domotique', 'smart home', 'maison intelligente', 'automatisation', 'tuya', 'zigbee', 'sonoff']
  },
  {
    label: 'Gadgets & accessoires',
    icon: Sparkles,
    aliases: ['Gadgets', 'Accessoires', 'Accessoire', 'Objets connectés'],
    keywords: ['gadget', 'gadgets', 'accessoire', 'accessoires', 'objet connecté', 'objets connectés', 'support', 'adaptateur']
  },
  {
    label: 'Sécurité incendie',
    icon: Shield,
    aliases: ['Sécurité incendie', 'Securite incendie', 'Incendie'],
    keywords: ['incendie', 'fumée', 'fumee', 'extincteur', 'détection incendie', 'detection incendie']
  }
]

const CATEGORY_ORDER = CATEGORY_DEFINITIONS.map((category) => category.label)
const CATEGORY_ICONS = Object.fromEntries(
  CATEGORY_DEFINITIONS.map((category) => [category.label, category.icon])
) as Record<string, LucideIcon>
const CORPORATE_SEARCH_TERMS = Array.from(
  new Set(CATEGORY_DEFINITIONS.flatMap((category) => [...category.aliases, ...category.keywords]))
)

const CATEGORY_DETAILS: Record<string, {
  summary: string
  defaultDetails: string[]
  serviceInclusions: string[]
  useCases: string[]
}> = {
  'Vidéosurveillance': {
    summary: 'Caméras IP, enregistreurs, stockage, vision nocturne et accès distant pour sécuriser vos locaux.',
    defaultDetails: ['Caméras HD/IP', 'Enregistrement local ou cloud', 'Accès mobile sécurisé', 'Vision nocturne'],
    serviceInclusions: ['Étude des angles morts', 'Pose et câblage', 'Configuration mobile', 'Formation utilisateur'],
    useCases: ['Bureaux', 'Commerces', 'Entrepôts', 'Résidences']
  },
  "Contrôle d'accès": {
    summary: 'Gestion des entrées par badge, empreinte, code ou reconnaissance faciale avec historique de passage.',
    defaultDetails: ['Badge/RFID', 'Biométrie', 'Gestion utilisateurs', 'Journal des accès'],
    serviceInclusions: ['Paramétrage des droits', 'Pose lecteurs et serrures', 'Tests de sécurité', 'Formation admin'],
    useCases: ['Bureaux', 'Écoles', 'Immeubles', 'Zones sensibles']
  },
  'Alarme & détection': {
    summary: 'Protection intrusion avec capteurs, sirènes, notifications et scénarios d’alerte adaptés au site.',
    defaultDetails: ['Détecteurs mouvement', 'Contacteurs portes', 'Sirène intérieure/extérieure', 'Alertes téléphone'],
    serviceInclusions: ['Étude périmétrique', 'Pose capteurs', 'Configuration alertes', 'Tests de déclenchement'],
    useCases: ['Maisons', 'Boutiques', 'Dépôts', 'Bureaux']
  },
  'Réseau & connectivité': {
    summary: 'Infrastructure réseau stable pour caméras, Wi-Fi, postes, serveurs et équipements connectés.',
    defaultDetails: ['Switch PoE', 'Routeurs', 'Câblage structuré', 'Baie réseau'],
    serviceInclusions: ['Audit réseau', 'Tirage câble', 'Configuration équipements', 'Tests débit et stabilité'],
    useCases: ['PME', 'Villas', 'Plateaux bureaux', 'Sites multi-équipements']
  },
  'Domotique': {
    summary: 'Automatisation des éclairages, accès, capteurs et appareils connectés avec pilotage mobile.',
    defaultDetails: ['Scénarios intelligents', 'Pilotage mobile', 'Capteurs connectés', 'Automatisation éclairage'],
    serviceInclusions: ['Conception scénarios', 'Installation modules', 'Configuration application', 'Prise en main'],
    useCases: ['Maisons', 'Appartements', 'Bureaux premium', 'Locations meublées']
  },
  'Gadgets & accessoires': {
    summary: 'Accessoires connectés et compléments techniques pour améliorer l’installation et le confort d’usage.',
    defaultDetails: ['Objets connectés', 'Accessoires réseau', 'Supports et alimentations', 'Modules complémentaires'],
    serviceInclusions: ['Conseil compatibilité', 'Installation rapide', 'Paramétrage', 'Assistance usage'],
    useCases: ['Complément installation', 'Confort connecté', 'Maintenance', 'Extension système']
  },
  'Sécurité incendie': {
    summary: 'Détection fumée, signalisation et dispositifs d’alerte pour renforcer la sécurité des bâtiments.',
    defaultDetails: ['Détecteurs fumée', 'Signalisation', 'Centrale alerte', 'Maintenance périodique'],
    serviceInclusions: ['Repérage zones à risque', 'Pose détecteurs', 'Tests alarme', 'Plan de maintenance'],
    useCases: ['ERP', 'Bureaux', 'Entrepôts', 'Habitations']
  }
}

export const metadata = {
  title: 'Solutions & Équipements | IT Vision — Sécurité Électronique',
  description:
    'Équipements professionnels de sécurité électronique : vidéosurveillance, contrôle d\'accès, alarme, réseau. Devis personnalisé, installation et maintenance au Sénégal.',
}

const FALLBACK_PRODUCTS: CorporateProduct[] = [
  {
    id: 'camera-ip',
    name: 'Caméras IP professionnelles',
    category: 'Vidéosurveillance',
    tagline: 'Surveillance HD pour sites professionnels et résidentiels',
    description: 'Solutions de surveillance HD pour bureaux, commerces, entrepôts et résidences.',
    priceAmount: 85000,
    currency: 'FCFA',
    features: ['Vision nocturne', 'Accès mobile', 'Installation incluse', 'Enregistrement sécurisé'],
    detailPoints: ['Caméra IP HD', 'NVR/DVR selon besoin', 'Application mobile', 'Pose mur/plafond'],
    serviceInclusions: ['Étude des zones', 'Installation complète', 'Configuration smartphone', 'Maintenance disponible'],
    useCases: ['Boutiques', 'Bureaux', 'Entrepôts', 'Résidences'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande avec installation',
    deliveryLabel: 'Installation planifiée après validation',
  },
  {
    id: 'controle-acces',
    name: 'Contrôle d’accès biométrique',
    category: "Contrôle d'accès",
    tagline: 'Accès sécurisé par badge, empreinte ou code',
    description: 'Gestion sécurisée des accès par empreinte, badge, code ou reconnaissance faciale.',
    priceAmount: 120000,
    currency: 'FCFA',
    features: ['Gestion utilisateurs', 'Historique passages', 'Multi-sites', 'Badge ou biométrie'],
    detailPoints: ['Lecteur biométrique', 'Badges RFID', 'Gâche ou serrure', 'Journal des passages'],
    serviceInclusions: ['Pose lecteur', 'Création utilisateurs', 'Test accès', 'Formation administrateur'],
    useCases: ['Bureaux', 'Écoles', 'Immeubles', 'Zones privées'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande avec installation',
    deliveryLabel: 'Installation sur rendez-vous',
  },
  {
    id: 'alarme-intrusion',
    name: 'Système d’alarme intrusion',
    category: 'Alarme & détection',
    tagline: 'Protection intrusion avec alertes instantanées',
    description: 'Protection périmétrique et volumétrique avec alertes en temps réel.',
    priceAmount: 95000,
    currency: 'FCFA',
    features: ['Détecteurs mouvement', 'Sirène', 'Notifications', 'Capteurs portes'],
    detailPoints: ['Détecteurs PIR', 'Contacteurs ouverture', 'Sirène', 'Application d’alerte'],
    serviceInclusions: ['Étude du périmètre', 'Pose capteurs', 'Configuration alertes', 'Tests de déclenchement'],
    useCases: ['Maisons', 'Dépôts', 'Commerces', 'Bureaux'],
    stockStatus: 'in_stock',
    stockQuantity: 3,
    availabilityLabel: 'Stock limité à Dakar',
    deliveryLabel: 'Installation rapide selon disponibilité',
  },
  {
    id: 'reseau-poe',
    name: 'Réseau & switches PoE',
    category: 'Réseau & connectivité',
    tagline: 'Infrastructure fiable pour caméras, Wi‑Fi et postes',
    description: 'Infrastructure réseau fiable pour caméras IP, Wi-Fi, postes et équipements connectés.',
    priceAmount: 65000,
    currency: 'FCFA',
    features: ['Switches PoE', 'Câblage structuré', 'Baie réseau', 'Tests débit'],
    detailPoints: ['Switch PoE', 'Routeur', 'Câble réseau', 'Organisation baie'],
    serviceInclusions: ['Audit réseau', 'Tirage câble', 'Configuration', 'Tests de stabilité'],
    useCases: ['PME', 'Plateaux bureaux', 'Villas', 'Sites caméras'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
    deliveryLabel: 'Déploiement selon taille du site',
  },
  {
    id: 'domotique',
    name: 'Domotique résidentielle',
    category: 'Domotique',
    tagline: 'Automatisation et pilotage intelligent du bâtiment',
    description: 'Automatisation des éclairages, accès, capteurs et scénarios intelligents.',
    priceAmount: 75000,
    currency: 'FCFA',
    features: ['Scénarios', 'Pilotage mobile', 'Capteurs', 'Automatisation'],
    detailPoints: ['Modules connectés', 'Capteurs', 'Application mobile', 'Scénarios personnalisés'],
    serviceInclusions: ['Conception scénarios', 'Pose modules', 'Configuration appli', 'Prise en main'],
    useCases: ['Villas', 'Appartements', 'Bureaux premium', 'Locations'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
    deliveryLabel: 'Étude préalable recommandée',
  },
  {
    id: 'detection-incendie',
    name: 'Détection incendie',
    category: 'Sécurité incendie',
    tagline: 'Alerte fumée et sécurité bâtiment',
    description: 'Détecteurs fumée, signalisation et dispositifs d’alerte pour sites professionnels.',
    priceAmount: 55000,
    currency: 'FCFA',
    features: ['Détection fumée', 'Signalisation', 'Maintenance', 'Tests périodiques'],
    detailPoints: ['Détecteurs fumée', 'Signalisation sonore', 'Centrale selon besoin', 'Plan maintenance'],
    serviceInclusions: ['Repérage zones', 'Pose détecteurs', 'Tests alarme', 'Maintenance'],
    useCases: ['Bureaux', 'Entrepôts', 'Commerces', 'Habitations'],
    stockStatus: 'preorder',
    stockQuantity: 0,
    availabilityLabel: 'Sur commande',
    deliveryLabel: 'Déploiement après diagnostic',
  },
]

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function uniqueList(values: Array<string | undefined | null>, limit: number): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).slice(0, limit)
}

function resolveCorporateCategory(product: any): string | null {
  const haystack = normalizeText([
    product.category,
    product.name,
    product.tagline,
    ...(Array.isArray(product.tags) ? product.tags : [])
  ].filter(Boolean).join(' '))

  for (const category of CATEGORY_DEFINITIONS) {
    const terms = [...category.aliases, ...category.keywords].map(normalizeText)
    if (terms.some((term) => haystack.includes(term))) return category.label
  }

  return null
}

function getAvailabilityLabel(status: CorporateProduct['stockStatus'], quantity: number, leadTimeDays?: number): string {
  if (status === 'in_stock') return quantity > 0 ? `${quantity} en stock à Dakar` : 'Disponible à Dakar'
  if (status === 'out_of_stock') return 'Rupture temporaire'
  return leadTimeDays ? `Sur commande · ${leadTimeDays} jours` : 'Sur commande'
}

function getDeliveryLabel(status: CorporateProduct['stockStatus'], leadTimeDays?: number, deliveryDays?: number): string {
  if (status === 'in_stock') return deliveryDays ? `Pose possible sous ${deliveryDays} jours` : 'Pose rapide selon planning'
  if (status === 'out_of_stock') return 'Délai à confirmer'
  const days = leadTimeDays || deliveryDays
  return days ? `Approvisionnement estimé ${days} jours` : 'Délai confirmé au devis'
}

async function getCorporateProducts(): Promise<CorporateProduct[]> {
  try {
    await connectDB()

    const termRegexes = CORPORATE_SEARCH_TERMS.map((term) => new RegExp(escapeRegex(term), 'i'))
    const docs = await ProductValidated.find({
      isPublished: { $ne: false },
      $or: [
        { category: { $in: termRegexes } },
        { name: { $in: termRegexes } },
        { tagline: { $in: termRegexes } },
        { tags: { $in: termRegexes } }
      ]
    })
      .select('name category description tagline tags image price b2bPrice currency features stockStatus stockQuantity leadTimeDays deliveryDays availabilityNote isFeatured createdAt')
      .sort({ isFeatured: -1, category: 1, name: 1, createdAt: -1 })
      .limit(80)
      .lean()

    const products = docs
      .map((p: any) => {
        const category = resolveCorporateCategory(p)
        if (!category) return null
        const stockStatus = ['in_stock', 'preorder', 'out_of_stock'].includes(p.stockStatus) ? p.stockStatus : 'preorder'
        const stockQuantity = typeof p.stockQuantity === 'number' ? p.stockQuantity : 0
        const categoryDetails = CATEGORY_DETAILS[category]
        const cleanDescription = stripHtml(p.description || p.tagline || categoryDetails?.summary || '')
        const dbFeatures = Array.isArray(p.features) ? p.features.filter(Boolean) : []
        const tags = Array.isArray(p.tags) ? p.tags.filter(Boolean) : []
        const priceAmount = typeof p.b2bPrice === 'number' && p.b2bPrice > 0
          ? p.b2bPrice
          : typeof p.price === 'number'
            ? p.price
            : undefined

        return {
          id: String(p._id),
          name: p.name || 'Produit',
          category,
          tagline: p.tagline || categoryDetails?.summary,
          description: cleanDescription,
          image: p.image || undefined,
          priceAmount,
          currency: p.currency || 'FCFA',
          features: uniqueList([...dbFeatures, ...(categoryDetails?.defaultDetails || [])], 4),
          detailPoints: uniqueList([...dbFeatures, ...tags, ...(categoryDetails?.defaultDetails || [])], 6),
          serviceInclusions: categoryDetails?.serviceInclusions || ['Conseil technique', 'Installation', 'Configuration', 'Assistance'],
          useCases: categoryDetails?.useCases || ['Entreprise', 'Résidentiel', 'Commerce'],
          stockStatus,
          stockQuantity,
          availabilityLabel: getAvailabilityLabel(stockStatus, stockQuantity, p.leadTimeDays),
          deliveryLabel: getDeliveryLabel(stockStatus, p.leadTimeDays, p.deliveryDays),
        } as CorporateProduct
      })
      .filter((product): product is CorporateProduct => Boolean(product))

    return products.length > 0 ? products : FALLBACK_PRODUCTS
  } catch {
    return FALLBACK_PRODUCTS
  }
}

export default async function CorporateProduitsPage() {
  const products = await getCorporateProducts()

  const grouped = new Map<string, CorporateProduct[]>()
  for (const p of products) {
    const list = grouped.get(p.category) || []
    list.push(p)
    grouped.set(p.category, list)
  }

  const categories = CATEGORY_ORDER.filter((c) => grouped.has(c))
  const otherCats = Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c))
  const allCategories = [...categories, ...otherCats]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:py-20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/40 to-transparent" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-green-300/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <Shield className="h-3 w-3" />
            Solutions professionnelles
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Catalogue corporate <span className="text-green-600">IT Vision</span>
          </h1>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-300 sm:text-lg max-w-2xl mx-auto">
            Caméras, contrôle d'accès, alarmes, domotique, réseau et gadgets connectés sélectionnés pour les projets IT Vision.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['Produits métier', `${products.length} références filtrées`],
              ['Prix corporate', 'Ajustables depuis l’admin'],
              ['Stock', 'Dakar ou sur commande']
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/70 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
                <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
            >
              <Phone className="h-4 w-4" />
              Demander un devis
            </a>
            <a
              href="mailto:contact@itvision.sn"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Mail className="h-4 w-4" />
              contact@itvision.sn
            </a>
          </div>
        </div>
      </section>

      {/* Produits par catégorie */}
      <section className="mx-auto max-w-7xl px-4 py-8 space-y-12">
        {allCategories.map((cat) => {
          const items = grouped.get(cat) || []
          const Icon = CATEGORY_ICONS[cat] || Shield
          return (
            <div key={cat}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 shadow-sm ring-1 ring-green-100 dark:bg-green-900/20 dark:ring-green-900/40">
                    <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{cat}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} produit{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''} pour vos projets</p>
                  </div>
                </div>
                <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 dark:text-green-300">
                  Demander un lot
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => {
                  const inStock = p.stockStatus === 'in_stock'
                  const outOfStock = p.stockStatus === 'out_of_stock'
                  return (
                    <article
                      key={p.id}
                      className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-green-500/40"
                    >
                      <div className="relative h-52 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Icon className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                          </div>
                        )}
                        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-800 shadow-sm backdrop-blur dark:bg-slate-950/90 dark:text-white">
                          <Icon className="h-3.5 w-3.5 text-green-600" />
                          {cat}
                        </div>
                        <div className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur ${
                          inStock
                            ? 'bg-emerald-100/95 text-emerald-700'
                            : outOfStock
                              ? 'bg-red-100/95 text-red-700'
                              : 'bg-blue-100/95 text-blue-700'
                        }`}>
                          <PackageCheck className="h-3.5 w-3.5" />
                          {inStock ? 'En stock' : outOfStock ? 'Rupture' : 'Sur commande'}
                        </div>
                      </div>

                      <div className="flex min-h-[420px] flex-col p-5">
                        <div className="flex-1">
                          <h3 className="text-base font-extrabold text-gray-900 line-clamp-2 dark:text-white">{p.name}</h3>
                          {p.tagline && (
                            <p className="mt-1 text-sm font-semibold text-green-700 dark:text-green-300">{p.tagline}</p>
                          )}
                          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                            {p.description || 'Équipement professionnel sélectionné pour les installations IT Vision avec accompagnement technique complet.'}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Prix</div>
                              <div className="mt-1 text-sm font-extrabold text-green-600 dark:text-green-400">
                                {p.priceAmount !== undefined
                                  ? `${Math.round(p.priceAmount).toLocaleString('fr-FR')} ${p.currency}`
                                  : 'Sur devis'}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Disponibilité</div>
                              <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{p.availabilityLabel}</div>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                              <Clock3 className="h-4 w-4 flex-shrink-0 text-blue-500" />
                              <span>{p.deliveryLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                              <MapPin className="h-4 w-4 flex-shrink-0 text-green-500" />
                              <span>Dakar et intervention sur site</span>
                            </div>
                          </div>

                          {p.detailPoints.length > 0 && (
                            <div className="mt-4">
                              <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Détails produit</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {p.detailPoints.map((detail) => (
                                  <span key={detail} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {detail}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.useCases.length > 0 && (
                            <div className="mt-4">
                              <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Adapté pour</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {p.useCases.map((useCase) => (
                                  <span key={useCase} className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
                                    {useCase}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.serviceInclusions.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                                <Wrench className="h-4 w-4 text-green-600" />
                                Prestation IT Vision incluse
                              </div>
                              <ul className="grid gap-2 sm:grid-cols-2">
                                {p.serviceInclusions.map((service) => (
                                  <li key={service} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                    <span>{service}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="mt-5 flex gap-2">
                          <Link
                            href={`/produits/${p.id}`}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                          >
                            Voir fiche
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/contact?produit=${encodeURIComponent(p.name)}`}
                            className="inline-flex items-center justify-center rounded-2xl border border-green-200 px-4 py-3 text-sm font-bold text-green-700 transition-colors hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/40"
                          >
                            Devis
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="grid gap-4 rounded-3xl border border-green-100 bg-white p-5 shadow-sm dark:border-green-900/40 dark:bg-slate-900 md:grid-cols-3">
          {[
            ['Catalogue maîtrisé', 'Uniquement les familles liées aux activités IT Vision.'],
            ['Prix administrables', 'Le prix corporate se règle dans la fiche produit admin.'],
            ['Stock lisible', 'Disponible à Dakar, sur commande ou rupture temporaire.']
          ].map(([title, text]) => (
            <div key={title} className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/30">
                <BadgeCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white">{title}</div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 p-8 text-white shadow-xl">
          <h2 className="text-xl font-bold sm:text-2xl">Un projet à sécuriser ?</h2>
          <p className="mt-2 text-sm text-white/90">
            Nos équipes vous accompagnent de l'étude à l'installation, avec maintenance incluse.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors"
            >
              Demander un devis
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/services"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
            >
              Découvrir nos services
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
