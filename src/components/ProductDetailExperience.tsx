'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  MessageCircle,
  Palette,
  Plane,
  Share2,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Sparkles,
  Star,
  Truck
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

type InfoTab =
  | { id: 'description'; label: string; type: 'text'; content: string }
  | { id: 'features' | 'support'; label: string; type: 'list'; content: string[] }
  | { id: 'logistics'; label: string; type: 'logistics' }

const shippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  if (methodId.includes('truck')) return Truck
  return Plane
}

const availabilityBadge = (status?: string) => {
  if (status === 'in_stock') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
  if (status === 'preorder') return 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
  return 'bg-slate-500/10 text-slate-200 border border-slate-500/20'
}

const colorBadgeStyle = (label: string) => {
  const normalized = label.toLowerCase()
  if (normalized.includes('noir')) return 'bg-gradient-to-br from-slate-800 to-slate-900'
  if (normalized.includes('blanc')) return 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800'
  if (normalized.includes('rouge')) return 'bg-gradient-to-br from-rose-500 to-rose-600'
  if (normalized.includes('bleu')) return 'bg-gradient-to-br from-sky-500 to-blue-600'
  if (normalized.includes('vert')) return 'bg-gradient-to-br from-emerald-500 to-emerald-600'
  if (normalized.includes('gris')) return 'bg-gradient-to-br from-slate-500 to-slate-600'
  return 'bg-gradient-to-br from-purple-500 to-indigo-600'
}

export default function ProductDetailExperience({ product, similar }: ProductDetailExperienceProps) {
  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image || '/file.svg']
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(product.pricing.shippingOptions[0]?.id ?? null)
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colorOptions.filter(Boolean)[0] ?? null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(product.variantOptions.filter(Boolean)[0] ?? null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [showNegotiation, setShowNegotiation] = useState(false)
  const [negotiationMessage, setNegotiationMessage] = useState('Bonjour, je souhaite discuter du tarif et des délais pour ce produit.')
  const [negotiationStatus, setNegotiationStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [recent, setRecent] = useState<RecentProduct[]>([])
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)

  const shippingEnabled = product.pricing.shippingOptions.length > 0 && product.availability.status !== 'in_stock'

  useEffect(() => {
    if (!shippingEnabled) {
      setSelectedShippingId(null)
      return
    }
    if (!selectedShippingId || !product.pricing.shippingOptions.find((option) => option.id === selectedShippingId)) {
      setSelectedShippingId(product.pricing.shippingOptions[0]?.id ?? null)
    }
  }, [shippingEnabled, selectedShippingId, product.pricing.shippingOptions])

  const activeShipping = shippingEnabled && selectedShippingId
    ? product.pricing.shippingOptions.find((option) => option.id === selectedShippingId) || null
    : null

  const unitPrice = !product.requiresQuote
    ? (shippingEnabled && activeShipping ? activeShipping.total : product.pricing.salePrice)
    : null

  const totalPrice = useMemo(() => {
    if (!unitPrice) return null
    return unitPrice * Math.max(1, quantity)
  }, [unitPrice, quantity])

  const unitPriceLabel = unitPrice ? formatCurrency(unitPrice, product.pricing.currency) : null
  const totalPriceLabel = totalPrice ? formatCurrency(totalPrice, product.pricing.currency) : null
  const baseCostLabel = formatCurrency(product.pricing.baseCost, product.pricing.currency)
  const marginLabel = typeof product.pricing.marginRate === 'number' ? `${product.pricing.marginRate}%` : null

  const whatsappUrl = () => {
    const channel = shippingEnabled
      ? activeShipping?.label || 'À définir'
      : 'Retrait / livraison locale Dakar'
    const message = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${product.name}.
Mode de transport souhaité: ${channel}.
Quantité: ${quantity}.
Merci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${message}`
  }

  const addToCart = (redirect = false) => {
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
        items[existsIndex].qty += Math.max(1, quantity)
        items[existsIndex].price = unitPrice
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
          qty: Math.max(1, quantity),
          price: unitPrice,
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
      trackEvent('add_to_cart', { productId: product.id, quantity })
      window.dispatchEvent(new CustomEvent('cart:updated'))
      if (redirect) {
        setTimeout(() => {
          window.location.href = '/panier'
        }, 200)
      }
    } finally {
      setAdding(false)
    }
  }

  const handleShare = async () => {
    try {
      if (typeof window === 'undefined') return
      const url = window.location.href
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.tagline ?? product.description ?? product.name, url })
        setShareFeedback('Lien partagé avec succès !')
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setShareFeedback('Lien copié dans le presse-papiers.')
      }
    } catch (error) {
      console.error('share product', error)
      setShareFeedback('Impossible de partager automatiquement ce produit.')
    }
  }

  const handleNegotiationSubmit = async () => {
    setNegotiationStatus('sending')
    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      setNegotiationStatus('sent')
      trackEvent('negotiation_request', { productId: product.id })
      setTimeout(() => {
        setShowNegotiation(false)
        setNegotiationStatus('idle')
      }, 1200)
    } catch (error) {
      console.error('negotiation error', error)
      setNegotiationStatus('idle')
    }
  }

  const handleQuantityChange = (value: number) => {
    if (!Number.isFinite(value)) return
    setQuantity(Math.max(1, Math.round(value)))
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
      priceLabel: unitPriceLabel,
      href: `/produits/${product.id}`
    }

    const filtered = items.filter((item) => item.id !== product.id)
    const updated = [currentEntry, ...filtered].slice(0, 8)
    window.localStorage.setItem('catalog:recent', JSON.stringify(updated))
    setRecent(updated.filter((item) => item.id !== product.id))
  }, [product.id, product.name, product.image, product.gallery, unitPriceLabel])

  useEffect(() => {
    if (!shareFeedback) return
    const timeout = setTimeout(() => setShareFeedback(null), 2500)
    return () => clearTimeout(timeout)
  }, [shareFeedback])

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
    if (product.sourcing?.platform) {
      entries.push({ label: 'Plateforme sourcing', value: product.sourcing.platform })
    }
    if (product.sourcing?.supplierName) {
      entries.push({ label: 'Fournisseur', value: product.sourcing.supplierName })
    }
    if (product.sourcing?.supplierContact) {
      entries.push({ label: 'Contact', value: product.sourcing.supplierContact })
    }
    return entries
  }, [product.logistics, product.availability.leadTimeDays, product.sourcing])

  const availabilityClass = availabilityBadge(product.availability.status)
  const showQuote = product.requiresQuote || unitPrice === null
  const deliveryDays = activeShipping?.durationDays ?? product.availability.leadTimeDays ?? null

  const infoTabs: InfoTab[] = [
    {
      id: 'description',
      label: 'Description',
      type: 'text',
      content: product.description || 'Description détaillée disponible sur demande auprès de nos équipes sourcing.'
    },
    {
      id: 'features',
      label: 'Points forts',
      type: 'list',
      content: product.features.filter(Boolean).length > 0
        ? product.features.filter(Boolean)
        : ['Qualité professionnelle import Chine', 'Installation & support IT Vision Dakar', 'Tarification optimisée selon le mode de transport']
    },
    {
      id: 'logistics',
      label: 'Informations logistiques',
      type: 'logistics'
    },
    {
      id: 'support',
      label: 'Garantie & SAV',
      type: 'list',
      content: [
        'Garantie constructeur 12 mois (extensions possibles)',
        'Assistance IT Vision 7j/7 sur Dakar & Sénégal',
        'Maintenance préventive et curative disponible',
        product.sourcing?.notes ? `Notes acheteur : ${product.sourcing.notes}` : 'Support import dédié Chine & Sénégal'
      ]
    }
  ]

  const [activeTab, setActiveTab] = useState<InfoTab['id']>(infoTabs[0].id)

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="text-sm text-slate-400 mb-6 flex items-center gap-2">
          <Link href="/produits" className="hover:text-emerald-400 transition">Catalogue</Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200/80">{product.category || 'Fiche produit'}</span>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          <aside className="hidden xl:block w-64 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-4">
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Derniers consultés</h3>
              {recent.length === 0 && <p className="text-xs text-slate-500">Les produits consultés récemment s’afficheront ici.</p>}
              <div className="space-y-3">
                {recent.map((item) => (
                  <Link key={item.id} href={item.href} className="flex gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-2.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition">
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-800">
                      <Image
                        src={item.image || '/file.svg'}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-100 line-clamp-2">{item.name}</p>
                      <p className="text-[11px] text-emerald-300">{item.priceLabel || 'Sur devis'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-10">
            <motion.section
              className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-emerald-500/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] p-6 sm:p-8">
                <div className="grid gap-4 lg:grid-cols-[110px_minmax(0,1fr)]">
                  <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
                    {gallery.map((src, index) => (
                      <button
                        key={`${src}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={clsx(
                          'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border transition',
                          activeImageIndex === index
                            ? 'border-emerald-400/70 ring-2 ring-emerald-500/40'
                            : 'border-slate-800 hover:border-emerald-400/50'
                        )}
                        aria-label={`Image ${index + 1}`}
                      >
                        <Image src={src} alt={`${product.name} ${index + 1}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                  <motion.div
                    key={activeImageIndex}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="relative aspect-[5/4] w-full rounded-3xl border border-slate-800 bg-slate-950/60"
                  >
                    <Image
                      src={gallery[activeImageIndex] || '/file.svg'}
                      alt={product.name}
                      fill
                      className="object-contain p-6"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    {/* Badge style AliExpress/1688 */}
                    {product.sourcing?.platform && (
                      <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white border border-orange-400/50 shadow-lg">
                        <Sparkles className="h-3.5 w-3.5" />
                        {product.sourcing.platform === 'aliexpress' ? 'AliExpress' : product.sourcing.platform === '1688' ? '1688' : 'Import Chine'}
                      </div>
                    )}
                    {!product.sourcing?.platform && (
                      <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500/90 to-cyan-500/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white border border-blue-400/50 shadow-lg">
                        <Sparkles className="h-3.5 w-3.5" />
                        Qualité Pro Chine
                      </div>
                    )}
                    <div className={clsx('absolute top-4 right-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', availabilityClass)}>
                      <Clock className="h-3.5 w-3.5" />
                      {product.availability.label}
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                          <ShieldCheck className="h-4 w-4" /> Sourcing sécurisé IT Vision
                        </div>
                        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-50 leading-tight">{product.name}</h1>
                        {product.tagline && <p className="mt-1 text-sm text-slate-300/90">{product.tagline}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={handleShare}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-400/40 hover:text-emerald-200 transition"
                        >
                          <Share2 className="h-3.5 w-3.5" /> Partager
                        </button>
                        {shareFeedback && <span className="text-[11px] text-emerald-300">{shareFeedback}</span>}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Style 1688 - informations techniques */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-bold">Informations sourcing</div>
                        <div className="mt-2 text-sm text-slate-300 flex flex-col gap-2">
                          {product.sourcing?.platform && (
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50">
                              <span className="text-slate-400">Plateforme :</span>
                              <span className="font-bold text-orange-400">
                                {product.sourcing.platform === 'aliexpress' ? 'AliExpress' : product.sourcing.platform === '1688' ? '1688' : product.sourcing.platform.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {product.sourcing?.supplierName && (
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50">
                              <span className="text-slate-400">Fournisseur :</span>
                              <span className="font-semibold text-slate-100">{product.sourcing.supplierName}</span>
                            </div>
                          )}
                          {baseCostLabel && (
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50">
                              <span className="text-slate-400">Coût fournisseur :</span>
                              <strong className="text-slate-100">{baseCostLabel}</strong>
                            </div>
                          )}
                          {marginLabel && (
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50">
                              <span className="text-slate-400">Marge :</span>
                              <strong className="text-slate-100">{marginLabel}</strong>
                            </div>
                          )}
                          {deliveryDays && (
                            <div className="flex items-center justify-between py-1.5">
                              <span className="text-slate-400">Délai estimé :</span>
                              <strong className="text-slate-100">{deliveryDays} jours</strong>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Style AliExpress - badge de confiance */}
                      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-200">
                          <Star className="h-4 w-4 text-orange-400 fill-orange-400" /> 
                          <span>Fiabilité vérifiée</span>
                        </div>
                        <div className="text-sm text-orange-50/90">
                          +50 projets réalisés • Livraison 3-15j • Contrôle qualité Dakar
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {product.colorOptions.filter(Boolean).length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Couleurs disponibles</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {product.colorOptions.filter(Boolean).map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={clsx(
                                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition border border-transparent',
                                  colorBadgeStyle(color),
                                  selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-400/60' : 'opacity-80 hover:opacity-100'
                                )}
                              >
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/70" />
                                {color}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {product.variantOptions.filter(Boolean).length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Variantes / packs</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {product.variantOptions.filter(Boolean).map((variant) => (
                              <button
                                key={variant}
                                type="button"
                                onClick={() => setSelectedVariant(variant)}
                                className={clsx(
                                  'rounded-2xl bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:border-emerald-400/40 transition',
                                  selectedVariant === variant && 'border-emerald-400/60 text-emerald-200 shadow-lg shadow-emerald-500/10'
                                )}
                              >
                                {variant}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-[160px,1fr] items-end">
                        <div>
                          <label htmlFor="quantity-input" className="text-xs uppercase tracking-wide text-slate-500">Quantité</label>
                          <input
                            id="quantity-input"
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => handleQuantityChange(Number(e.target.value))}
                            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
                          />
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 flex items-center justify-between">
                          <div>
                            <div className="text-xs text-slate-500">Prix unitaire</div>
                            <div className="font-semibold text-slate-50">{unitPriceLabel || 'Sur devis'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Total</div>
                            <div className="font-semibold text-emerald-300">{totalPriceLabel || '—'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  <div className="w-full rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 p-6 shadow-orange-500/10 shadow-2xl space-y-5 lg:max-w-[420px]">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-orange-200 font-bold">Prix catalogue</div>
                      <div className="mt-1 text-4xl font-bold text-orange-100">{totalPriceLabel || unitPriceLabel || 'Sur devis'}</div>
                      {!showQuote && quantity > 1 && (
                        <div className="text-xs text-orange-200/80 mt-1">{quantity} unité(s) × {unitPriceLabel}</div>
                      )}
                      {!showQuote && quantity === 1 && unitPriceLabel && (
                        <div className="text-xs text-orange-200/80 mt-1">Prix unitaire</div>
                      )}
                    </div>

                    <div className={clsx('rounded-2xl px-3 py-2.5 text-xs font-bold border', availabilityClass)}>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{product.availability.note || product.pricing.availabilitySubLabel || 'Suivi logistique assuré par IT Vision'}</span>
                      </div>
                    </div>

                    {shippingEnabled && (
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-emerald-200/70">Modes de transport</div>
                        <div className="flex flex-wrap gap-2">
                          {product.pricing.shippingOptions.map((option) => {
                            const Icon = shippingIcon(option.id)
                            const active = option.id === selectedShippingId
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelectedShippingId(option.id)}
                                className={clsx(
                                  'flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition',
                                  active
                                    ? 'border-orange-400/80 bg-gradient-to-r from-orange-500/30 to-red-500/30 text-orange-100 shadow-lg shadow-orange-500/20'
                                    : 'border-orange-400/20 bg-transparent text-orange-200 hover:border-orange-300/60'
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{option.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        {activeShipping && (
                          <div className="rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500/10 to-red-500/10 px-3 py-2 text-xs text-orange-100 font-medium">
                            <div className="flex items-center justify-between">
                              <span>{activeShipping.label}</span>
                              <span className="font-bold">{formatCurrency(activeShipping.cost, activeShipping.currency)}</span>
                            </div>
                            <div className="text-[10px] text-orange-200/80 mt-1">Délai : {activeShipping.durationDays} jours</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Boutons style AliExpress - gros et colorés */}
                      {!showQuote && (
                        <button
                          type="button"
                          onClick={() => addToCart(true)}
                          disabled={adding}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-4 py-3 text-sm font-bold text-white transition shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                          <ShoppingCart className="h-5 w-5" /> {adding ? 'Ajout…' : 'Acheter maintenant'}
                        </button>
                      )}
                      {!showQuote && (
                        <button
                          type="button"
                          onClick={() => addToCart(false)}
                          disabled={adding}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-orange-400/60 bg-transparent px-4 py-3 text-sm font-bold text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/10"
                        >
                          <ShoppingCart className="h-5 w-5" /> {adding ? 'Ajout…' : 'Ajouter au panier'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNegotiation(true)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300/40 bg-slate-900/50 px-4 py-2.5 text-sm font-semibold text-orange-200 hover:border-orange-300/80 hover:bg-orange-500/10"
                      >
                        <MessageCircle className="h-4 w-4" /> Négocier le tarif
                      </button>
                      <a
                        href={whatsappUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent('quote_request', { productId: product.id, quantity })}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-500/50 bg-green-500/10 px-4 py-2.5 text-sm font-bold text-green-200 hover:border-green-400 hover:bg-green-500/20 transition"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                        </svg>
                        Demander un devis WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6">
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-emerald-300" />
                  <span className="text-sm font-semibold text-slate-100">Personnalisez votre commande</span>
                </div>
                <div className="text-xs text-slate-500">Choix : {selectedColor || '—'} • {selectedVariant || 'Standard'} • {quantity} unité(s)</div>
              </div>
              <div className="px-6 pb-6 pt-4 text-sm text-slate-300">
                Optimisez vos coûts en ajustant la couleur, le pack et le mode de transport. Nos conseillers recalculent ensuite la marge et les délais pour votre projet.
              </div>
            </motion.section>

            <motion.section
              className="rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-6 pt-6">
                {infoTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'rounded-full px-4 py-2 text-xs font-semibold transition',
                      activeTab === tab.id
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        : 'bg-slate-900/70 text-slate-400 border border-transparent hover:border-emerald-400/30 hover:text-emerald-200'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="px-6 pb-6 pt-4">
                <AnimatePresence mode="wait">
                  {infoTabs.map((tab) => {
                    if (tab.id !== activeTab) return null
                    return (
                      <motion.div
                        key={tab.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="text-sm text-slate-300"
                      >
                        {tab.type === 'text' && (
                          <p className="leading-relaxed whitespace-pre-line">{tab.content}</p>
                        )}
                        {tab.type === 'list' && (
                          <ul className="space-y-2">
                            {tab.content.map((item, index) => (
                              <li key={`${tab.id}-${index}`} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-300 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {tab.type === 'logistics' && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {logisticsEntries.map((entry, index) => (
                              <div key={`${tab.id}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">{entry.label}</div>
                                <div className="mt-1 text-sm text-slate-100">{entry.value || '—'}</div>
                              </div>
                            ))}
                            {logisticsEntries.length === 0 && (
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
                                Informations logistiques détaillées disponibles sur demande.
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </motion.section>
          </main>

          <aside className="w-full xl:w-72 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Produits similaires</h3>
              {similar.length === 0 && (
                <p className="text-xs text-slate-500">Nous enrichissons le catalogue pour vous proposer des alternatives ciblées.</p>
              )}
              <div className="space-y-3">
                {similar.map((item) => {
                  const Icon = shippingIcon(item.shippingOptions[0]?.id)
                  const itemPrice = !item.requiresQuote
                    ? formatCurrency(item.priceAmount ?? item.shippingOptions[0]?.total ?? null, item.currency || 'FCFA')
                    : null
                  return (
                    <Link
                      key={item.id}
                      href={`/produits/${item.id}`}
                      className="flex gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3 hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-500/10 transition"
                    >
                      <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-800">
                        <Image
                          src={item.image || '/file.svg'}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-100 line-clamp-2">{item.name}</div>
                        <div className="text-xs text-emerald-200 mt-1">{itemPrice || 'Sur devis'}</div>
                        <div className={clsx('mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', availabilityBadge(item.availabilityStatus))}>
                          <Icon className="h-3 w-3" />
                          {item.availabilityLabel || (item.availabilityStatus === 'in_stock' ? 'Stock Dakar' : 'Commande Chine')}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </Link>
                  )
                })}
              </div>
            </div>

            {product.sourcing?.productUrl && (
              <a
                href={product.sourcing.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-5 text-sm font-semibold text-emerald-100 hover:border-emerald-300/60 transition"
              >
                Consulter la fiche fournisseur
                <ExternalLink className="ml-2 inline h-4 w-4" />
              </a>
            )}
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {!showQuote && unitPriceLabel && (
          <motion.div
            className="fixed inset-x-4 bottom-4 z-40 md:hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 backdrop-blur px-4 py-3 flex items-center justify-between gap-4 shadow-lg shadow-emerald-500/20">
              <div>
                <div className="text-xs text-emerald-100/80">Total</div>
                <div className="text-base font-semibold text-emerald-50">{totalPriceLabel || unitPriceLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => addToCart(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                <ShoppingCart className="h-4 w-4" /> Acheter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNegotiation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Négocier avec un conseiller</h3>
                  <p className="text-xs text-slate-500 mt-1">Partagez vos conditions (quantités, délais, transport préféré). Nos équipes vous recontactent sous 24h.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNegotiation(false)
                    setNegotiationStatus('idle')
                  }}
                  className="text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                rows={4}
                className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400/60 focus:outline-none"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">Produit : {product.name}</span>
                <button
                  type="button"
                  onClick={handleNegotiationSubmit}
                  disabled={negotiationStatus === 'sending'}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  {negotiationStatus === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {negotiationStatus === 'sent' ? 'Message envoyé !' : 'Envoyer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
