import { notFound } from 'next/navigation'
import Image from 'next/image'
import { connectDB } from '@/lib/db'
import ProductValidated from '@/lib/models/Product.validated'
import {
  Shield, CheckCircle, MessageCircle, Phone, ArrowLeft, PackageCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WA_NUMBER = '221781234567'
const WA_BASE = `https://wa.me/${WA_NUMBER}?text=`

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function getProduct(id: string) {
  try {
    await connectDB()
    const doc = await ProductValidated.findOne({ _id: id, isPublished: { $ne: false } })
      .select('name category description tagline image price b2bPrice currency features stockStatus stockQuantity brand weight dimensions')
      .lean() as any
    return doc ?? null
  } catch {
    return null
  }
}

export default async function CorporateProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await getProduct(id)
  if (!doc) notFound()

  const name: string = doc.name || 'Produit'
  const description: string = stripHtml(doc.description || doc.tagline || '')
  const tagline: string = doc.tagline || ''
  const image: string | undefined = doc.image || undefined
  const features: string[] = Array.isArray(doc.features) ? doc.features.filter(Boolean) : []
  const stockStatus: string = doc.stockStatus || 'preorder'
  const stockQuantity: number = typeof doc.stockQuantity === 'number' ? doc.stockQuantity : 0
  const priceAmount: number | undefined =
    typeof doc.b2bPrice === 'number' && doc.b2bPrice > 0
      ? doc.b2bPrice
      : typeof doc.price === 'number' && doc.price > 0
        ? doc.price
        : undefined
  const currency: string = doc.currency || 'FCFA'
  const inStock = stockStatus === 'in_stock'
  const outOfStock = stockStatus === 'out_of_stock'
  const waText = encodeURIComponent(`Bonjour IT Vision, je suis intéressé par : ${name}`)

  const stockLabel = inStock
    ? stockQuantity > 0 ? `${stockQuantity} en stock à Dakar` : 'Disponible à Dakar'
    : outOfStock ? 'Rupture temporaire' : 'Sur commande'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Back */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl">
          <a
            href="/corporate-produits"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au catalogue
          </a>
        </div>
      </div>

      {/* Produit */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">

          {/* Image */}
          <div className="relative h-80 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 lg:h-auto lg:min-h-[400px]">
            {image ? (
              <Image
                src={image}
                alt={name}
                fill
                className="object-contain p-4"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Shield className="h-24 w-24 text-slate-300 dark:text-slate-700" />
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="flex flex-col gap-5">
            {doc.category && (
              <span className="inline-block w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                {doc.category}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{name}</h1>
              {tagline && <p className="mt-1 text-sm font-semibold text-green-700 dark:text-green-300">{tagline}</p>}
            </div>

            {/* Prix + stock */}
            <div className="flex items-center gap-4">
              <div className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                {priceAmount !== undefined
                  ? `${Math.round(priceAmount).toLocaleString('fr-FR')} ${currency}`
                  : <span className="text-lg text-gray-400">Prix sur devis</span>}
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                inStock ? 'bg-emerald-100 text-emerald-700' : outOfStock ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <PackageCheck className="h-3.5 w-3.5" />
                {stockLabel}
              </span>
            </div>

            {/* Description */}
            {description && (
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">Description</h2>
                <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{description}</p>
              </div>
            )}

            {/* Features */}
            {features.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Caractéristiques</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specs rapides */}
            {(doc.brand || doc.weight || doc.dimensions) && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Fiche technique</h2>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {doc.brand && (
                    <>
                      <dt className="text-xs font-semibold text-gray-500">Marque</dt>
                      <dd className="text-xs font-bold text-gray-900 dark:text-white">{doc.brand}</dd>
                    </>
                  )}
                  {doc.weight && (
                    <>
                      <dt className="text-xs font-semibold text-gray-500">Poids</dt>
                      <dd className="text-xs font-bold text-gray-900 dark:text-white">{doc.weight} kg</dd>
                    </>
                  )}
                  {doc.dimensions && (
                    <>
                      <dt className="text-xs font-semibold text-gray-500">Dimensions</dt>
                      <dd className="text-xs font-bold text-gray-900 dark:text-white">{doc.dimensions}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`${WA_BASE}${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white hover:bg-[#1ebe5d] transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Acheter sur WhatsApp
              </a>
              <a
                href={`/contact?produit=${encodeURIComponent(name)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Demander un devis
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
