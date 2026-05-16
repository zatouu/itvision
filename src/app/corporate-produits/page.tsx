import Image from 'next/image'
import { connectDB } from '@/lib/db'
import ProductValidated from '@/lib/models/Product.validated'
import {
  Camera, Shield, Lock, Wifi, Bell, Cpu, Sparkles,
  Phone, Mail, CheckCircle, ArrowRight, PackageCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CATEGORIES: Array<{ label: string; icon: LucideIcon; aliases: string[]; keywords: string[] }> = [
  {
    label: 'Vidéosurveillance',
    icon: Camera,
    aliases: ['Vidéosurveillance', 'Camera', 'Caméra', 'Cameras', 'Caméras', 'CCTV'],
    keywords: ['camera', 'caméra', 'videosurveillance', 'vidéosurveillance', 'cctv', 'hikvision', 'dahua', 'nvr', 'dvr'],
  },
  {
    label: "Contrôle d'accès",
    icon: Lock,
    aliases: ["Contrôle d'Accès", "Contrôle d'accès", 'Access Control', 'Biométrie'],
    keywords: ['contrôle', 'controle', 'accès', 'acces', 'biométrique', 'badge', 'rfid', 'serrure'],
  },
  {
    label: 'Alarme & détection',
    icon: Bell,
    aliases: ['Alarme', 'Alarmes', 'Détection', 'Detection'],
    keywords: ['alarme', 'alarm', 'détecteur', 'detecteur', 'sirène', 'intrusion', 'capteur'],
  },
  {
    label: 'Réseau & connectivité',
    icon: Wifi,
    aliases: ['Réseau', 'Reseau', 'Wifi', 'Wi-Fi', 'Switch', 'PoE'],
    keywords: ['réseau', 'reseau', 'wifi', 'wi-fi', 'switch', 'poe', 'routeur', 'câble', 'cable'],
  },
  {
    label: 'Domotique',
    icon: Cpu,
    aliases: ['Domotique', 'Smart Home', 'Maison intelligente'],
    keywords: ['domotique', 'smart home', 'maison intelligente', 'automatisation', 'tuya', 'zigbee', 'sonoff'],
  },
  {
    label: 'Gadgets & accessoires',
    icon: Sparkles,
    aliases: ['Gadgets', 'Accessoires', 'Accessoire', 'Objets connectés'],
    keywords: ['gadget', 'accessoire', 'objet connecté', 'support', 'adaptateur'],
  },
  {
    label: 'Sécurité incendie',
    icon: Shield,
    aliases: ['Sécurité incendie', 'Incendie'],
    keywords: ['incendie', 'fumée', 'fumee', 'extincteur', 'détection incendie'],
  },
]

const CATEGORY_ORDER = CATEGORIES.map((c) => c.label)
const CATEGORY_ICONS = Object.fromEntries(CATEGORIES.map((c) => [c.label, c.icon])) as Record<string, LucideIcon>
const SEARCH_TERMS = Array.from(new Set(CATEGORIES.flatMap((c) => [...c.aliases, ...c.keywords])))

export const metadata = {
  title: 'Solutions & Équipements | IT Vision — Sécurité Électronique',
  description:
    "Équipements professionnels de sécurité électronique : vidéosurveillance, contrôle d'accès, alarme, réseau. Devis personnalisé, installation et maintenance au Sénégal.",
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

function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    const terms = [...cat.aliases, ...cat.keywords].map(normalizeStr)
    if (terms.some((t) => hay.includes(t))) return cat.label
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

  const grouped = new Map<string, CorporateProduct[]>()
  for (const p of products) {
    const list = grouped.get(p.category) ?? []
    list.push(p)
    grouped.set(p.category, list)
  }
  const allCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white px-4 py-14 shadow-sm dark:bg-slate-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-green-300 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <Shield className="h-3 w-3" />
            Catalogue corporate IT Vision
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Équipements &amp; solutions sécurité
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-500 dark:text-gray-400">
            Vidéosurveillance, contrôle d&apos;accès, alarmes, domotique, réseau — des équipements
            sélectionnés pour les projets IT Vision avec accompagnement technique complet.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Demander un devis
            </a>
            <a
              href="mailto:contact@itvision.sn"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 transition-colors"
            >
              <Mail className="h-4 w-4" />
              contact@itvision.sn
            </a>
          </div>
        </div>
      </section>

      {/* ── Nav catégories ── */}
      <nav className="sticky top-0 z-20 overflow-x-auto border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl gap-2">
          {allCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] ?? Shield
            const count = grouped.get(cat)?.length ?? 0
            return (
              <a
                key={cat}
                href={`#cat-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
              >
                <Icon className="h-3.5 w-3.5" />
                {cat}
                <span className="ml-0.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                  {count}
                </span>
              </a>
            )
          })}
        </div>
      </nav>

      {/* ── Produits par catégorie ── */}
      <main className="mx-auto max-w-7xl space-y-14 px-4 py-10">
        {allCategories.map((cat) => {
          const items = grouped.get(cat) ?? []
          const Icon = CATEGORY_ICONS[cat] ?? Shield
          const anchorId = `cat-${cat.replace(/\s+/g, '-').toLowerCase()}`
          return (
            <section key={cat} id={anchorId} className="scroll-mt-20">
              {/* En-tête catégorie */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-green-50 ring-1 ring-green-100 dark:bg-green-900/20 dark:ring-green-900/40">
                    <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{cat}</h2>
                    <p className="text-xs text-gray-400">{items.length} équipement{items.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <a
                  href={`/contact?categorie=${encodeURIComponent(cat)}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 dark:text-green-300"
                >
                  Devis pour cette catégorie
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Grille produits */}
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => {
                  const inStock = p.stockStatus === 'in_stock'
                  const outOfStock = p.stockStatus === 'out_of_stock'
                  return (
                    <article
                      key={p.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      {/* Image */}
                      <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Icon className="h-14 w-14 text-slate-300 dark:text-slate-700" />
                          </div>
                        )}
                        {/* Badge stock */}
                        <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          inStock
                            ? 'bg-emerald-100 text-emerald-700'
                            : outOfStock
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}>
                          <PackageCheck className="h-3 w-3" />
                          {inStock ? 'En stock' : outOfStock ? 'Rupture' : 'Sur commande'}
                        </span>
                      </div>

                      {/* Corps */}
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">{p.name}</h3>
                        {p.description ? (
                          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{p.description}</p>
                        ) : null}

                        {/* Prix + disponibilité */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Prix</div>
                            <div className="mt-0.5 text-sm font-extrabold text-green-600 dark:text-green-400">
                              {p.priceAmount !== undefined
                                ? `${Math.round(p.priceAmount).toLocaleString('fr-FR')} ${p.currency}`
                                : 'Sur devis'}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Dispo</div>
                            <div className="mt-0.5 text-xs font-bold text-gray-800 dark:text-white">{p.availabilityLabel}</div>
                          </div>
                        </div>

                        {/* Features */}
                        {p.features.length > 0 && (
                          <ul className="mt-4 space-y-1.5">
                            {p.features.map((f) => (
                              <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* CTA */}
                        <div className="mt-5">
                          <a
                            href={`/contact?produit=${encodeURIComponent(p.name)}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
                          >
                            Demander un devis
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>

      {/* ── CTA final ── */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 p-8 text-center text-white shadow-xl">
          <h2 className="text-xl font-bold sm:text-2xl">Un projet à sécuriser ?</h2>
          <p className="mt-2 text-sm text-white/85">
            Nos équipes vous accompagnent de l&apos;étude à l&apos;installation, maintenance incluse.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors"
            >
              Demander un devis
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/services"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Nos services
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
