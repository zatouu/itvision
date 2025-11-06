'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Package,
  Plane,
  Ship,
  ShoppingCart,
  Star,
  Truck,
  MapPin,
  Palette,
  Layers,
  ExternalLink
} from 'lucide-react'
import type { ShippingOptionPricing } from '@/lib/logistics'
import { trackEvent } from '@/utils/analytics'

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

interface ProductDimensions {
  lengthCm: number
  widthCm: number
  heightCm: number
}

export interface ProductDetailData {
  id: string
  name: string
  tagline?: string | null
  description?: string | null
  category?: string | null
  image?: string | null
  gallery: string[]
  features: string[]
  colorOptions: string[]
  variantOptions: string[]
  requiresQuote: boolean
  currency?: string | null
  pricing: {
    baseCost: number | null
    marginRate: number
    salePrice: number | null
    currency: string
    shippingOptions: ShippingOptionPricing[]
    availabilityLabel: string
    availabilitySubLabel?: string
  }
  availability: {
    status: 'in_stock' | 'preorder' | string
    label: string
    note?: string | null
    stockQuantity: number
    leadTimeDays: number | null
  }
  logistics: {
    weightKg: number | null
    packagingWeightKg: number | null
    volumeM3: number | null
    dimensions: ProductDimensions | null
  }
  sourcing: {
    platform?: string | null
    supplierName?: string | null
    supplierContact?: string | null
    productUrl?: string | null
    notes?: string | null
  } | null
}

export interface SimilarProductSummary {
  id: string
  name: string
  tagline?: string | null
  category?: string | null
  image?: string | null
  priceAmount?: number | null
  currency?: string | null
  requiresQuote: boolean
  availabilityStatus?: 'in_stock' | 'preorder' | string
  availabilityLabel?: string
  shippingOptions: ShippingOptionPricing[]
  deliveryDays?: number | null
}

interface ProductDetailExperienceProps {
  product: ProductDetailData
  similar: SimilarProductSummary[]
}

interface RecentProduct {
  id: string
  name: string
  image?: string | null
  priceLabel: string | null
  href: string
}

const shippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  if (methodId.includes('truck')) return Truck
  return Plane
}

const availabilityBadge = (status?: string) => {
  if (status === 'in_stock') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'preorder') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-50 text-gray-600 border-gray-200'
}

export default function ProductDetailExperience({ product, similar }: ProductDetailExperienceProps) {
  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image || '/file.svg']
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [adding, setAdding] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(product.pricing.shippingOptions[0]?.id ?? null)
  const [recent, setRecent] = useState<RecentProduct[]>([])

  const shippingEnabled = product.pricing.shippingOptions.length > 0 && product.availability.status !== 'in_stock'

  useEffect(() => {
    if (!shippingEnabled) {
      setSelectedShippingId(null)
    } else if (!selectedShippingId || !product.pricing.shippingOptions.find((option) => option.id === selectedShippingId)) {
      setSelectedShippingId(product.pricing.shippingOptions[0]?.id ?? null)
    }
  }, [shippingEnabled, selectedShippingId, product.pricing.shippingOptions])

  const activeShipping = shippingEnabled && selectedShippingId
    ? product.pricing.shippingOptions.find((option) => option.id === selectedShippingId) || null
    : null

  const computedPriceAmount = !product.requiresQuote
    ? (shippingEnabled && activeShipping ? activeShipping.total : product.pricing.salePrice)
    : null

  const priceLabel = computedPriceAmount ? formatCurrency(computedPriceAmount, product.pricing.currency) : null
  const baseCostLabel = formatCurrency(product.pricing.baseCost, product.pricing.currency)

  const whatsappUrl = () => {
    const channel = shippingEnabled
      ? activeShipping?.label || 'À définir'
      : 'Retrait / livraison locale Dakar'
    const message = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${product.name}.
Mode de transport souhaité: ${channel}.
Merci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${message}`
  }

  const addToCart = () => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const id = `${product.id}${shippingKey}`
      const currency = activeShipping?.currency || product.pricing.currency
      const existsIndex = items.findIndex((item: any) => item.id === id)

      if (existsIndex >= 0) {
        items[existsIndex].qty += 1
        items[existsIndex].price = computedPriceAmount
        items[existsIndex].currency = currency
        if (activeShipping) {
          items[existsIndex].shipping = {
            id: activeShipping.id,
            label: activeShipping.label,
            durationDays: activeShipping.durationDays,
            cost: activeShipping.cost,
            currency: activeShipping.currency
          }
        }
      } else {
        items.push({
          id,
          name: product.name,
          qty: 1,
          price: computedPriceAmount,
          currency,
          requiresQuote: !!product.requiresQuote,
          shipping: activeShipping ? {
            id: activeShipping.id,
            label: activeShipping.label,
            durationDays: activeShipping.durationDays,
            cost: activeShipping.cost,
            currency: activeShipping.currency
          } : undefined
        })
      }

      window.localStorage.setItem('cart:items', JSON.stringify(items))
      trackEvent('add_to_cart', { productId: product.id })
      window.dispatchEvent(new CustomEvent('cart:updated'))
      alert('Produit ajouté au panier')
    } finally {
      setAdding(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const recentRaw = window.localStorage.getItem('catalog:recent')
    let items: RecentProduct[] = []
    if (recentRaw) {
      try {
        items = JSON.parse(recentRaw)
      } catch (error) {
        console.error('parse recent products failed', error)
      }
    }

    const currentEntry: RecentProduct = {
      id: product.id,
      name: product.name,
      image: product.image ?? product.gallery?.[0] ?? '/file.svg',
      priceLabel: priceLabel,
      href: `/produits/${product.id}`
    }

    const filtered = items.filter((item) => item.id !== product.id)
    const updated = [currentEntry, ...filtered].slice(0, 8)
    window.localStorage.setItem('catalog:recent', JSON.stringify(updated))

    setRecent(updated.filter((item) => item.id !== product.id))
  }, [product.id, product.name, product.image, product.gallery, priceLabel])

  const logisticsEntries = useMemo(() => {
    const entries: { label: string; value: string | null }[] = []
    if (product.availability.leadTimeDays) {
      entries.push({ label: 'Délai moyen Chine', value: `${product.availability.leadTimeDays} jours` })
    }
    if (product.logistics.weightKg) {
      entries.push({ label: 'Poids net', value: `${product.logistics.weightKg.toFixed(2)} kg` })
    }
    if (product.logistics.packagingWeightKg) {
      entries.push({ label: 'Poids emballage', value: `${product.logistics.packagingWeightKg.toFixed(2)} kg` })
    }
    if (product.logistics.volumeM3) {
      entries.push({ label: 'Volume', value: `${product.logistics.volumeM3.toFixed(3)} m³` })
    }
    if (product.logistics.dimensions) {
      const { lengthCm, widthCm, heightCm } = product.logistics.dimensions
      entries.push({ label: 'Dimensions colis', value: `${lengthCm} × ${widthCm} × ${heightCm} cm` })
    }
    return entries
  }, [product.logistics, product.availability.leadTimeDays])

  const availabilityClass = availabilityBadge(product.availability.status)

  const showQuote = product.requiresQuote || computedPriceAmount === null
  const deliveryDays = activeShipping?.durationDays ?? product.availability.leadTimeDays ?? null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <Link href="/produits" className="hover:text-emerald-600">Catalogue</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{product.category || 'Fiche produit'}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px,1fr,320px]">
        <aside className="hidden lg:block space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Derniers consultés</h3>
            {recent.length === 0 && <p className="text-xs text-gray-500">Les produits récemment consultés apparaîtront ici.</p>}
            <div className="space-y-3">
              {recent.map((item) => (
                <Link key={item.id} href={item.href} className="flex gap-3 rounded-xl border border-gray-100 p-2 hover:border-emerald-200 hover:shadow-sm transition">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-50">
                    <Image
                      src={item.image || '/file.svg'}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{item.name}</p>
                    <p className="text-[11px] text-emerald-600">{item.priceLabel || 'Sur devis'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-8">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
                <div className="relative w-full rounded-2xl bg-gray-50 aspect-square overflow-hidden">
                  <Image
                    src={gallery[activeImageIndex] || '/file.svg'}
                    alt={product.name}
                    fill
                    className="object-contain p-6"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    Qualité Pro Chine
                  </div>
                  <div className={`absolute top-4 right-4 inline-flex items-center gap-1 border px-2 py-1 text-xs font-semibold ${availabilityClass}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {product.availability.label}
                  </div>
                </div>

                {gallery.length > 1 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {gallery.slice(0, 6).map((src, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`relative h-16 w-16 overflow-hidden rounded-xl border ${activeImageIndex === index ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200'}`}
                        aria-label={`Image ${index + 1}`}
                      >
                        <Image src={src} alt={`${product.name} ${index + 1}`} fill className="object-contain bg-white" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
                    {product.tagline && <p className="mt-1 text-sm text-gray-600">{product.tagline}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{showQuote ? 'Tarif sur demande' : 'Prix estimé'}</div>
                    <div className={`text-2xl font-semibold ${showQuote ? 'text-gray-700' : 'text-emerald-600'}`}>{priceLabel || 'Sur devis'}</div>
                    {!showQuote && deliveryDays && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                        <Clock className="h-3 w-3" /> {deliveryDays} jours estimés
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs text-gray-500 mb-1">Disponibilité</div>
                    <div className="text-sm font-medium text-gray-900">{product.availability.label}</div>
                    {product.availability.note && <p className="mt-1 text-xs text-gray-500">{product.availability.note}</p>}
                  </div>

                  {!showQuote && baseCostLabel && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-700">
                      <div className="font-semibold text-emerald-900">Synthèse tarif import</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span>Coût Chine: {baseCostLabel}</span>
                        <span>•</span>
                        <span>Marge: {product.pricing.marginRate}%</span>
                        {activeShipping && (
                          <span>•</span>
                        )}
                        {activeShipping && (
                          <span>Transport: {formatCurrency(activeShipping.cost, activeShipping.currency)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {shippingEnabled && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Modes de transport</div>
                      <div className="flex flex-wrap gap-2">
                        {product.pricing.shippingOptions.map((option) => {
                          const Icon = shippingIcon(option.id)
                          const active = option.id === selectedShippingId
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelectedShippingId(option.id)}
                              className={`px-4 py-2 rounded-2xl text-xs font-medium border transition flex items-center gap-2 ${active ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-emerald-400'}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span>{option.label}</span>
                              <span className="text-[11px] opacity-80">{option.durationDays} j</span>
                            </button>
                          )
                        })}
                      </div>
                      {activeShipping && (
                        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          Transport {activeShipping.label} : {formatCurrency(activeShipping.cost, activeShipping.currency)} (estimé)
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {!showQuote && (
                      <button
                        type="button"
                        onClick={addToCart}
                        disabled={adding}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                      >
                        <ShoppingCart className="h-4 w-4" /> {adding ? 'Ajout…' : 'Ajouter au panier'}
                      </button>
                    )}
                    <a
                      href={whatsappUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('quote_request', { productId: product.id })}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${showQuote ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
                      {showQuote ? 'Demander un devis' : 'Négocier le tarif'}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {product.description && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description détaillée</h2>
              <p className="leading-relaxed text-sm text-gray-700 whitespace-pre-line">{product.description}</p>
            </section>
          )}

          {product.features && product.features.filter(Boolean).length > 0 && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> Points forts</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.features.filter(Boolean).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(product.colorOptions.filter(Boolean).length > 0 || product.variantOptions.filter(Boolean).length > 0) && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Palette className="h-5 w-5 text-purple-500" /> Options & variantes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {product.colorOptions.filter(Boolean).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Couleurs disponibles</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.colorOptions.filter(Boolean).map((color, index) => (
                        <span key={index} className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.variantOptions.filter(Boolean).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Variantes / conditionnements</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.variantOptions.filter(Boolean).map((variant, index) => (
                        <span key={index} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          <Layers className="h-3.5 w-3.5" />
                          {variant}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {logisticsEntries.length > 0 && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-blue-500" /> Informations logistiques</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {logisticsEntries.map((entry, index) => (
                  <div key={index} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{entry.label}</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {product.sourcing && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-500" /> Sourcing fournisseur</h2>
              <div className="grid gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-28 text-gray-600">Plateforme</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{product.sourcing.platform || 'Direct usine Chine'}</span>
                </div>
                {product.sourcing.supplierName && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-28 text-gray-600">Fournisseur</span>
                    <span>{product.sourcing.supplierName}</span>
                  </div>
                )}
                {product.sourcing.supplierContact && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-28 text-gray-600">Contact</span>
                    <span>{product.sourcing.supplierContact}</span>
                  </div>
                )}
                {product.sourcing.productUrl && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-28 text-gray-600">Lien produit</span>
                    <a href={product.sourcing.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
                      Consulter la fiche fournisseur <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
                {product.sourcing.notes && (
                  <div>
                    <div className="font-semibold text-gray-600 mb-1">Notes Acheteur</div>
                    <p className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-line">{product.sourcing.notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Produits similaires</h3>
            {similar.length === 0 && (
              <p className="text-xs text-gray-500">Nous enrichissons le catalogue pour vous proposer des alternatives.</p>
            )}
            <div className="space-y-3">
              {similar.map((item) => {
                const Icon = shippingIcon(item.shippingOptions[0]?.id)
                const itemPrice = !item.requiresQuote ? formatCurrency(item.priceAmount ?? item.shippingOptions[0]?.total ?? null, item.currency || 'FCFA') : null
                return (
                  <Link
                    key={item.id}
                    href={`/produits/${item.id}`}
                    className="flex gap-3 rounded-2xl border border-gray-100 p-3 hover:border-emerald-200 hover:shadow-sm transition"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-50">
                      <Image
                        src={item.image || '/file.svg'}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</div>
                      {itemPrice ? (
                        <div className="text-xs font-semibold text-emerald-600 mt-1">{itemPrice}</div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-1">Sur devis</div>
                      )}
                      <div className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${availabilityBadge(item.availabilityStatus)}`}>
                        <Icon className="h-3 w-3" />
                        {item.availabilityLabel || (item.availabilityStatus === 'in_stock' ? 'Stock Dakar' : 'Commande Chine')}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </Link>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
