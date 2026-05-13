import Link from 'next/link'
import Image from 'next/image'
import { connectDB } from '@/lib/db'
import ProductValidated from '@/lib/models/Product.validated'
import {
  Camera, Shield, Lock, Wifi, Bell, Cpu,
  ArrowRight, Phone, Mail, CheckCircle
} from 'lucide-react'

interface CorporateProduct {
  id: string
  name: string
  category: string
  description: string
  image?: string
  priceAmount?: number
  currency: string
  features: string[]
}

const CATEGORY_ICONS: Record<string, any> = {
  'Vidéosurveillance': Camera,
  "Contrôle d'Accès": Lock,
  'Alarme': Bell,
  'Réseau': Wifi,
  'Domotique': Cpu,
  'Sécurité incendie': Shield,
}

const CATEGORY_ORDER = [
  'Vidéosurveillance',
  "Contrôle d'Accès",
  'Alarme',
  'Réseau',
  'Domotique',
  'Sécurité incendie',
]

export const metadata = {
  title: 'Solutions & Équipements | IT Vision — Sécurité Électronique',
  description:
    'Équipements professionnels de sécurité électronique : vidéosurveillance, contrôle d\'accès, alarme, réseau. Devis personnalisé, installation et maintenance au Sénégal.',
}

export default async function CorporateProduitsPage() {
  await connectDB()

  const docs = await ProductValidated.find({ isActive: { $ne: false } })
    .select('name category description image price currency features')
    .sort({ createdAt: -1 })
    .limit(60)
    .lean()

  const products: CorporateProduct[] = docs.map((p: any) => ({
    id: String(p._id),
    name: p.name || 'Produit',
    category: p.category || 'Autre',
    description: p.description || '',
    image: p.image || undefined,
    priceAmount: typeof p.price === 'number' ? p.price : undefined,
    currency: p.currency || 'FCFA',
    features: Array.isArray(p.features) ? p.features.slice(0, 3) : [],
  }))

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
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-green-300/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <Shield className="h-3 w-3" />
            Solutions professionnelles
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Équipements <span className="text-green-600">sécurité électronique</span>
          </h1>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-300 sm:text-lg max-w-2xl mx-auto">
            Caméras IP, contrôle d'accès, alarmes, domotique, réseau… Demandez un devis personnalisé pour votre projet résidentiel, tertiaire ou industriel.
          </p>
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
      <section className="mx-auto max-w-6xl px-4 py-8 space-y-12">
        {allCategories.map((cat) => {
          const items = grouped.get(cat) || []
          const Icon = CATEGORY_ICONS[cat] || Shield
          return (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20">
                  <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{cat}</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {p.image ? (
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800">
                          <Shield className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{p.name}</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
                        {p.priceAmount !== undefined && (
                          <p className="mt-2 text-sm font-bold text-green-600 dark:text-green-400">
                            À partir de {Math.round(p.priceAmount).toLocaleString('fr-FR')} {p.currency}
                          </p>
                        )}
                      </div>
                    </div>

                    {p.features.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      href={`/produits/${p.id}`}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition-colors dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      Voir la fiche
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
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
