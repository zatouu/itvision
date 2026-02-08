'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Heart,
  Info,
  Loader2,
  MessageCircle,
  Minus,
  Package,
  Plane,
  Play,
  Plus,
  Share2,
  Shield,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Star,
  Store,
  TrendingDown,
  Truck,
  Users,
  X,
  ZoomIn,
  MapPin,
  BadgeCheck,
  Building2,
  TrendingUp,
  Target,
} from 'lucide-react'
import { trackEvent } from '@/utils/analytics'
import { BASE_SHIPPING_RATES, type ShippingMethodId, type ShippingRate } from '@/lib/logistics'

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

// Markdown → HTML pour les descriptions produit (specs table + paragraphes)
const parseMarkdown = (text: string): string => {
  if (!text) return ''
  const sections = text.split(/\n\n+/)
  const htmlParts: string[] = []
  let specRows: string[] = []

  const flushSpecs = () => {
    if (specRows.length > 0) {
      htmlParts.push(
        '<table class="w-full text-sm border-collapse mb-4"><tbody>' +
        specRows.join('') +
        '</tbody></table>'
      )
      specRows = []
    }
  }

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue
    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      flushSpecs()
      const title = trimmed.replace(/\*\*/g, '')
      htmlParts.push(`<h3 class="text-base font-semibold text-gray-900 mt-4 mb-2">${title}</h3>`)
      continue
    }
    if (/^- \*\*/.test(trimmed)) {
      const lines = trimmed.split('\n')
      for (const line of lines) {
        const match = line.match(/^- \*\*(.+?)\*\*:\s*(.+)$/)
        if (match) {
          const bg = specRows.length % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          specRows.push(
            `<tr class="${bg}"><td class="py-2 px-3 text-gray-500 font-medium whitespace-nowrap border-b border-gray-100">${match[1]}</td>` +
            `<td class="py-2 px-3 text-gray-900 border-b border-gray-100">${match[2]}</td></tr>`
          )
        }
      }
      continue
    }
    flushSpecs()
    const html = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
    htmlParts.push(`<p class="text-sm text-gray-700 leading-relaxed mb-3">${html}</p>`)
  }
  flushSpecs()
  return htmlParts.join('\n')
}

interface ProductVariant {
  id: string
  name: string
  sku?: string
  image?: string
  price1688?: number
  priceFCFA?: number
  stock: number
  isDefault?: boolean
}

interface ProductVariantGroup {
  name: string
  variants: ProductVariant[]
}

interface ProductWeights {
  netWeightKg: number | null
  grossWeightKg: number | null
  packagingWeightKg: number | null
}

interface ProductDetailData {
  tags?: string[]
  id: string
  name: string
  tagline?: string | null
  description?: string | null
  category?: string | null
  image?: string | null
  condition?: 'new' | 'used' | 'refurbished'
  gallery: string[]
  features: string[]
  colorOptions: string[]
  variantOptions: string[]
  variantGroups?: ProductVariantGroup[]
  pricing1688?: {
    price1688: number
    price1688Currency: string
    exchangeRate: number
    serviceFeeRate?: number | null
    insuranceRate?: number | null
  } | null
  requiresQuote: boolean
  currency?: string | null
  pricing: {
    baseCost: number | null
    marginRate: number
    salePrice: number | null
    currency: string
    shippingOptions: any[]
    availabilityLabel: string
    availabilitySubLabel?: string
    fees?: {
      serviceFeeRate: number
      serviceFeeAmount: number
      insuranceRate: number
      insuranceAmount: number
    }
    totalWithFees?: number | null
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
    dimensions: { lengthCm: number; widthCm: number; heightCm: number } | null
  }
  weights?: ProductWeights
  isImported?: boolean
  groupBuyEnabled?: boolean
  groupBuyBestPrice?: number | null
  groupBuyDiscount?: number | null
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  priceTiers?: Array<{
    minQty: number
    maxQty?: number
    price: number
    discount?: number
  }>
  supplier?: {
    name: string
    location: string
    verified: boolean
    yearsInBusiness: number
    rating: number
    transactions: number
    responseTime: string
  }
}

interface SimilarProductSummary {
  id: string
  name: string
  tagline?: string | null
  category?: string | null
  image?: string | null
  condition?: 'new' | 'used' | 'refurbished'
  priceAmount?: number | null
  currency?: string | null
  requiresQuote: boolean
  availabilityStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  availabilityLabel?: string
  shippingOptions: any[]
  deliveryDays?: number | null
}

interface ProductDetail1688Props {
  product: ProductDetailData
  similar: SimilarProductSummary[]
}

export default function ProductDetail1688({ product, similar }: ProductDetail1688Props) {
  const baseGallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image || '/file.svg']

  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    product.variantGroups?.forEach(group => {
      const defaultVar = group.variants.find(v => v.isDefault) || group.variants[0]
      if (defaultVar) initial[group.name] = defaultVar.id
    })
    return initial
  })
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({})
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'specs' | 'description' | 'shipping' | 'reviews'>('specs')
  const [showImageModal, setShowImageModal] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const imageRef = useRef<HTMLDivElement>(null)
  const thumbContainerRef = useRef<HTMLDivElement>(null)
  const [adding, setAdding] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [shippingRates, setShippingRates] = useState<Record<ShippingMethodId, ShippingRate>>(BASE_SHIPPING_RATES)

  // ─── Fetch shipping rates ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(d => { if (d?.success && d?.rates) setShippingRates(d.rates) })
      .catch(() => {})
  }, [])

  // Charger favoris
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const favs = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      setIsFavorite(favs.includes(product.id))
    } catch { setIsFavorite(false) }
  }, [product.id])

  // ─── Computed ──────────────────────────────────────────────────────────────
  const gallery = useMemo(() => {
    const variantImage = product.variantGroups
      ?.flatMap(g => g.variants)
      .find(v => Object.values(selectedVariants).includes(v.id))?.image
    if (variantImage && !baseGallery.includes(variantImage)) return [variantImage, ...baseGallery]
    return baseGallery
  }, [selectedVariants, product.variantGroups, baseGallery])

  const unitWeightKg = product?.weights?.netWeightKg ?? product?.logistics?.weightKg ?? null
  const unitVolumeM3 = product?.logistics?.volumeM3 ?? null

  const currentTotalQty = useMemo(() => {
    const entries = Object.entries(variantQuantities).filter(([, qty]) => qty > 0)
    if (entries.length === 0) return quantity
    return entries.reduce((acc, [, qty]) => acc + qty, 0)
  }, [variantQuantities, quantity])

  const tieredUnitPrice = useMemo(() => {
    if (!product.priceTiers || product.priceTiers.length === 0) return null
    const sorted = [...product.priceTiers].sort((a, b) => b.minQty - a.minQty)
    return sorted.find(t => currentTotalQty >= t.minQty)?.price ?? null
  }, [product.priceTiers, currentTotalQty])

  const baseUnitPrice = useMemo(() => {
    if (tieredUnitPrice !== null) return tieredUnitPrice
    return product.pricing.totalWithFees ?? product.pricing.salePrice ?? 0
  }, [product.pricing.totalWithFees, product.pricing.salePrice, tieredUnitPrice])

  const variantCalculations = useMemo(() => {
    const entries = Object.entries(variantQuantities).filter(([, qty]) => qty > 0)
    if (entries.length === 0) {
      return { totalQuantity: quantity, subtotalProducts: baseUnitPrice * quantity, hasVariantSelection: false, selectedVariantsList: [] as Array<{ variant: ProductVariant; qty: number; price: number }> }
    }
    let totalQuantity = 0, subtotalProducts = 0
    const selectedVariantsList: Array<{ variant: ProductVariant; qty: number; price: number }> = []
    for (const [variantId, qty] of entries) {
      const variant = product.variantGroups?.flatMap(g => g.variants).find(v => v.id === variantId)
      if (!variant) continue
      const price = (variant.priceFCFA && variant.priceFCFA > 0) ? variant.priceFCFA : baseUnitPrice
      subtotalProducts += price * qty
      totalQuantity += qty
      selectedVariantsList.push({ variant, qty, price })
    }
    return { totalQuantity, subtotalProducts, hasVariantSelection: true, selectedVariantsList }
  }, [variantQuantities, quantity, baseUnitPrice, product.variantGroups])

  const shippingEstimate = useMemo(() => {
    if (!selectedShippingId) return null
    const rate = shippingRates[selectedShippingId as ShippingMethodId]
    if (!rate) return null
    const totalQty = variantCalculations.totalQuantity
    if (rate.billing === 'per_kg' && unitWeightKg) {
      const totalWeight = unitWeightKg * totalQty
      return { cost: Math.max(totalWeight * rate.rate, rate.minimumCharge || 0), label: `${totalWeight.toFixed(2)} kg × ${rate.rate.toLocaleString('fr-FR')} FCFA/kg`, method: rate.label }
    }
    if (rate.billing === 'per_cubic_meter' && unitVolumeM3) {
      const totalVolume = unitVolumeM3 * totalQty
      return { cost: Math.max(totalVolume * rate.rate, rate.minimumCharge || 0), label: `${totalVolume.toFixed(3)} m³ × ${rate.rate.toLocaleString('fr-FR')} FCFA/m³`, method: rate.label }
    }
    return null
  }, [selectedShippingId, variantCalculations.totalQuantity, unitWeightKg, unitVolumeM3, shippingRates])

  const grandTotal = variantCalculations.subtotalProducts + (shippingEstimate?.cost ?? 0)

  const priceTable = useMemo(() => {
    if (!product.priceTiers || product.priceTiers.length === 0) {
      return [{ qty: 1, maxQty: undefined as number | undefined, price: product.pricing.salePrice || 0, discount: 0 }]
    }
    return product.priceTiers.map(tier => ({
      qty: tier.minQty,
      maxQty: tier.maxQty as number | undefined,
      price: tier.price,
      discount: tier.discount || Math.round(((product.pricing.salePrice || tier.price) - tier.price) / (product.pricing.salePrice || tier.price) * 100)
    }))
  }, [product.priceTiers, product.pricing.salePrice])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    setZoomPosition({ x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)), y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)) })
  }

  const handleVariantQuantityChange = useCallback((variantId: string, delta: number) => {
    setVariantQuantities(prev => ({ ...prev, [variantId]: Math.max(0, (prev[variantId] || 0) + delta) }))
  }, [])

  const setVariantQuantityDirect = useCallback((variantId: string, value: number) => {
    setVariantQuantities(prev => ({ ...prev, [variantId]: Math.max(0, Math.round(value)) }))
  }, [])

  const addToCart = useCallback((redirect = false) => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const activeShipping = selectedShippingId ? shippingRates[selectedShippingId as ShippingMethodId] : null
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const currency = product.pricing.currency

      if (variantCalculations.hasVariantSelection) {
        for (const { variant, qty, price } of variantCalculations.selectedVariantsList) {
          const id = `${product.id}-${variant.id}${shippingKey}`
          const existsIndex = items.findIndex((item: any) => item.id === id)
          if (existsIndex >= 0) { items[existsIndex].qty += qty; items[existsIndex].price = price; items[existsIndex].currency = currency }
          else {
            const newItem: any = { id, name: `${product.name} — ${variant.name}`, qty, price, currency, requiresQuote: !!product.requiresQuote, variantId: variant.id, unitWeightKg: unitWeightKg ?? undefined, unitVolumeM3: unitVolumeM3 ?? undefined }
            if (activeShipping) newItem.shipping = { id: activeShipping.id, label: activeShipping.label, durationDays: activeShipping.durationDays, rate: activeShipping.rate }
            if (product.pricing.fees) { newItem.serviceFeeRate = product.pricing.fees.serviceFeeRate; newItem.serviceFeeAmount = product.pricing.fees.serviceFeeAmount; newItem.insuranceRate = product.pricing.fees.insuranceRate; newItem.insuranceAmount = product.pricing.fees.insuranceAmount }
            items.push(newItem)
          }
        }
      } else {
        const id = `${product.id}${shippingKey}`
        const existsIndex = items.findIndex((item: any) => item.id === id)
        if (existsIndex >= 0) { items[existsIndex].qty += quantity; items[existsIndex].price = baseUnitPrice; items[existsIndex].currency = currency }
        else {
          const newItem: any = { id, name: product.name, qty: quantity, price: baseUnitPrice, currency, requiresQuote: !!product.requiresQuote, unitWeightKg: unitWeightKg ?? undefined, unitVolumeM3: unitVolumeM3 ?? undefined }
          if (activeShipping) newItem.shipping = { id: activeShipping.id, label: activeShipping.label, durationDays: activeShipping.durationDays, rate: activeShipping.rate }
          if (product.pricing.fees) { newItem.serviceFeeRate = product.pricing.fees.serviceFeeRate; newItem.serviceFeeAmount = product.pricing.fees.serviceFeeAmount; newItem.insuranceRate = product.pricing.fees.insuranceRate; newItem.insuranceAmount = product.pricing.fees.insuranceAmount }
          items.push(newItem)
        }
      }
      window.localStorage.setItem('cart:items', JSON.stringify(items))
      trackEvent('add_to_cart', { productId: product.id, quantity: variantCalculations.totalQuantity })
      window.dispatchEvent(new CustomEvent('cart:updated'))
      if (redirect) setTimeout(() => { window.location.href = '/panier' }, 200)
    } finally { setAdding(false) }
  }, [product, quantity, baseUnitPrice, selectedShippingId, shippingRates, variantCalculations, unitWeightKg, unitVolumeM3])

  const toggleFavorite = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const favs = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      if (isFavorite) { localStorage.setItem('wishlist:items', JSON.stringify(favs.filter((id: string) => id !== product.id))); setIsFavorite(false) }
      else { favs.push(product.id); localStorage.setItem('wishlist:items', JSON.stringify(favs)); setIsFavorite(true) }
      window.dispatchEvent(new CustomEvent('wishlist:updated'))
    } catch {}
  }, [isFavorite, product.id])

  const shareProduct = () => {
    const text = encodeURIComponent(`🔥 ${product.name}\n💰 À partir de ${formatCurrency(product.pricing.salePrice)}\n📦 MOQ: ${product.priceTiers?.[0]?.minQty || 1} unités\n${window.location.href}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const whatsappUrl = () => {
    const variantInfo = variantCalculations.hasVariantSelection ? `\nVariantes: ${variantCalculations.selectedVariantsList.map(v => `${v.variant.name} (x${v.qty})`).join(', ')}` : ''
    const message = encodeURIComponent(`Bonjour, je souhaite un devis pour: ${product.name}.${variantInfo}\nQuantité totale: ${variantCalculations.totalQuantity}.\nMerci de me recontacter.`)
    return `https://wa.me/221774133440?text=${message}`
  }

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)

  const scrollThumbs = (direction: 'up' | 'down') => {
    if (!thumbContainerRef.current) return
    const scrollAmount = 80
    thumbContainerRef.current.scrollBy({ top: direction === 'up' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
  }

  const getShippingIcon = (id?: string) => {
    if (!id) return Plane
    if (id.includes('sea')) return Ship
    if (id.includes('truck')) return Truck
    return Plane
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-green-600">Accueil</Link>
          <span>/</span>
          <Link href="/produits" className="hover:text-green-600">Produits</Link>
          {product.category && (
            <>
              <span>/</span>
              <span className="text-gray-900 font-medium">{product.category}</span>
            </>
          )}
        </nav>

        {/* ═══ LAYOUT PRINCIPAL : Galerie gauche + Sidebar droite fixe ═══ */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ──────── COLONNE GAUCHE : Galerie style 1688 ──────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex gap-2 p-2">

                {/* Thumbnails verticales à gauche avec flèches haut/bas */}
                {gallery.length > 1 && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: 72 }}>
                    <button
                      onClick={() => scrollThumbs('up')}
                      className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <div
                      ref={thumbContainerRef}
                      className="flex flex-col gap-2 overflow-y-auto scrollbar-hide flex-1"
                      style={{ maxHeight: 420 }}
                    >
                      {gallery.map((media, idx) => {
                        const isVideo = isVideoUrl(media)
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            onMouseEnter={() => setActiveImageIndex(idx)}
                            className={clsx(
                              "relative flex-shrink-0 rounded-md border-2 overflow-hidden transition-all",
                              activeImageIndex === idx
                                ? "border-green-500 ring-2 ring-green-200 shadow-sm"
                                : "border-gray-200 hover:border-green-400 opacity-70 hover:opacity-100"
                            )}
                            style={{ width: 64, height: 64 }}
                          >
                            {isVideo ? (
                              <>
                                <video src={media} muted className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </>
                            ) : (
                              <Image src={media} alt={`${product.name} ${idx + 1}`} fill className="object-cover" sizes="64px" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => scrollThumbs('down')}
                      className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Image / Vidéo principale à droite */}
                <div className="flex-1 relative">
                  {isVideoUrl(gallery[activeImageIndex] || '') ? (
                    <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                      <video
                        src={gallery[activeImageIndex]}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      ref={imageRef}
                      className="relative aspect-[4/3] bg-gray-50 cursor-zoom-in group rounded-lg overflow-hidden"
                      onMouseEnter={() => setIsZoomed(true)}
                      onMouseLeave={() => setIsZoomed(false)}
                      onMouseMove={handleMouseMove}
                      onClick={() => setShowImageModal(true)}
                    >
                      <Image
                        src={gallery[activeImageIndex] || '/file.svg'}
                        alt={product.name}
                        fill
                        className={clsx("object-contain p-4 transition-transform duration-300", isZoomed && "scale-[2]")}
                        style={isZoomed ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        priority
                      />
                      {product.isImported && (
                        <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                          <Globe className="w-3 h-3" />
                          Import Chine
                        </div>
                      )}
                      {product.condition === 'used' && (
                        <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">Occasion</div>
                      )}
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <ZoomIn className="w-3 h-3" />
                        Cliquer pour agrandir
                      </div>
                      {/* Flèches navigation sur l'image */}
                      {gallery.length > 1 && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i => i > 0 ? i - 1 : gallery.length - 1) }} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition">
                            <ArrowLeft className="w-4 h-4 text-gray-700" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i => i < gallery.length - 1 ? i + 1 : 0) }} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition">
                            <ArrowRight className="w-4 h-4 text-gray-700" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {/* Compteur d'images */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {gallery.map((_, idx) => (
                      <div key={idx} className={clsx("w-1.5 h-1.5 rounded-full transition", activeImageIndex === idx ? "bg-green-500 w-4" : "bg-gray-300")} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ──────── ONGLETS sous la galerie (style 1688) ──────── */}
            <div className="mt-6 bg-white rounded-xl shadow-sm">
              <div className="flex border-b sticky top-0 bg-white rounded-t-xl z-10">
                {([
                  { id: 'description' as const, label: 'Description du produit' },
                  { id: 'specs' as const, label: 'Spécifications' },
                  { id: 'shipping' as const, label: 'Expédition' },
                  { id: 'reviews' as const, label: 'Avis' },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "flex-1 py-4 text-sm font-medium border-b-3 transition",
                      activeTab === tab.id
                        ? "border-green-500 text-green-600 bg-green-50/50"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'description' && (
                  <div className="max-w-none">
                    {product.description ? (
                      <div dangerouslySetInnerHTML={{ __html: parseMarkdown(product.description) }} />
                    ) : (
                      <p className="text-gray-500 italic">Description détaillée disponible sur demande auprès de nos équipes sourcing.</p>
                    )}
                  </div>
                )}

                {activeTab === 'specs' && (
                  <div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {product.features.filter(Boolean).map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    {(product.logistics.dimensions || product.logistics.weightKg) && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Dimensions & Poids</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {product.logistics.dimensions && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                              <Package className="w-4 h-4 text-blue-500" />
                              <span>{product.logistics.dimensions.lengthCm} × {product.logistics.dimensions.widthCm} × {product.logistics.dimensions.heightCm} cm</span>
                            </div>
                          )}
                          {product.logistics.weightKg && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                              <TrendingUp className="w-4 h-4 text-purple-500" />
                              <span>Poids: {product.logistics.weightKg} kg</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Choisissez votre mode de transport. Le coût exact sera calculé au panier selon le poids/volume total.</p>
                    <div className="grid md:grid-cols-3 gap-4">
                      {Object.values(shippingRates).map((rate) => {
                        const Icon = getShippingIcon(rate.id)
                        return (
                          <div key={rate.id} className={clsx("p-4 rounded-xl border-2 cursor-pointer transition-all", selectedShippingId === rate.id ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-200 hover:border-green-300")}>
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-5 h-5 text-green-600" />
                              <span className="font-bold text-sm">{rate.label}</span>
                            </div>
                            <p className="text-xl font-bold text-green-600">{rate.rate.toLocaleString('fr-FR')} FCFA</p>
                            <p className="text-xs text-gray-500">par {rate.billing === 'per_kg' ? 'kg' : 'm³'} • {rate.durationDays}j estimés</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    {/* En-tête avis style 1688 */}
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-base font-bold text-gray-900">Avis sur les produits</h3>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">5.0</span>
                      <span className="text-sm text-gray-500">( 3 avis )</span>
                      <span className="text-xs text-gray-400 ml-1">| Taux de commentaires positifs : 100 %</span>
                    </div>

                    {/* Tabs de filtre avis */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {[
                        { label: 'tous 3', active: true },
                        { label: 'Image incluse 2', active: false },
                        { label: 'Avis positif 3', active: false },
                        { label: 'Contenu 3', active: false },
                      ].map((filter, idx) => (
                        <button
                          key={idx}
                          className={clsx(
                            "px-4 py-1.5 rounded text-sm font-medium border transition",
                            filter.active
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {/* Cartes d'avis */}
                    <div className="space-y-6">
                      {/* Avis placeholder 1 */}
                      <div className="border-b border-gray-100 pb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">A</div>
                          <span className="text-sm text-gray-500">Achat anonyme</span>
                          <span className="text-xs text-gray-400">| 1ensemble</span>
                          <span className="text-xs text-green-600 font-medium ml-1">Clients réguliers</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Excellent produit, conforme à la description. La qualité est au rendez-vous et le rapport qualité-prix est très satisfaisant.
                        </p>
                        {/* Images de l'avis */}
                        {gallery.length > 0 && (
                          <div className="flex gap-2">
                            {gallery.slice(0, 3).map((img, imgIdx) => (
                              <div key={imgIdx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-green-400 transition">
                                <Image src={img} alt={`Avis photo ${imgIdx + 1}`} fill className="object-cover" sizes="80px" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Avis placeholder 2 */}
                      <div className="border-b border-gray-100 pb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">B</div>
                          <span className="text-sm text-gray-500">Achat anonyme</span>
                          <span className="text-xs text-gray-400">| 1ensemble</span>
                          <span className="text-xs text-green-600 font-medium ml-1">Clients réguliers</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Peut mieux faire sur l&apos;emballage mais le produit fonctionne parfaitement.
                        </p>
                        {gallery.length > 1 && (
                          <div className="flex gap-2">
                            {gallery.slice(1, 3).map((img, imgIdx) => (
                              <div key={imgIdx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-green-400 transition">
                                <Image src={img} alt={`Avis photo ${imgIdx + 1}`} fill className="object-cover" sizes="80px" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Avis placeholder 3 */}
                      <div className="pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">C</div>
                          <span className="text-sm text-gray-500">Achat anonyme</span>
                          <span className="text-xs text-gray-400">| 2 pièces</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          Livraison rapide, produit conforme. Je recommande.
                        </p>
                      </div>
                    </div>

                    {/* Bouton voir tous les avis */}
                    <div className="flex justify-center mt-4 pt-4 border-t border-gray-200">
                      <button className="px-6 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:border-green-400 hover:text-green-600 transition flex items-center gap-1">
                        <ChevronDown className="w-4 h-4" />
                        Voir tous les avis
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ──────── Détails du produit (images grand format scroll vertical style 1688) ──────── */}
            <div className="mt-6 bg-white rounded-xl shadow-sm">
              <div className="border-b px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900">Détails du produit</h2>
              </div>
              <div className="p-4 space-y-1">
                {gallery.map((media, idx) => (
                  <div key={idx} className="relative w-full">
                    {isVideoUrl(media) ? (
                      <video src={media} controls className="w-full rounded-lg" />
                    ) : (
                      <Image
                        src={media}
                        alt={`${product.name} - détail ${idx + 1}`}
                        width={800}
                        height={800}
                        className="w-full h-auto rounded-lg"
                        sizes="(max-width: 1024px) 100vw, 55vw"
                      />
                    )}
                  </div>
                ))}
                {product.description && (
                  <div className="pt-4 border-t mt-4">
                    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(product.description) }} />
                  </div>
                )}
              </div>
            </div>

            {/* ──────── Produits similaires (grille) ──────── */}
            {similar.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Produits similaires</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {similar.slice(0, 6).map(item => (
                    <Link key={item.id} href={`/produits/${item.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-green-300 hover:shadow-md transition group">
                      <div className="relative aspect-square bg-gray-50">
                        <Image src={item.image || '/file.svg'} alt={item.name} fill className="object-contain p-3 group-hover:scale-105 transition" sizes="(max-width: 640px) 50vw, 33vw" />
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{item.name}</h4>
                        <p className="text-green-600 font-bold text-sm">{formatCurrency(item.priceAmount) || 'Sur devis'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ──────── COLONNE DROITE : Sidebar fixe au scroll avec scroll interne ──────── */}
          <div className="w-full lg:w-[420px] flex-shrink-0">
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 space-y-4 scrollbar-thin">

              {/* ══ Titre + Disponibilité ══ */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> IT Vision
                  </span>
                  <span className={clsx("text-xs font-medium px-2 py-1 rounded-full", product.availability.status === 'in_stock' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                    {product.availability.label}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 mb-1">{product.name}</h1>
                {product.tagline && <p className="text-sm text-gray-500 mb-3">{product.tagline}</p>}

                {/* Rating compact */}
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                    <span className="ml-1 font-medium">4.8</span>
                  </div>
                  <span>•</span>
                  <span>128 avis</span>
                </div>

                {/* ══ Prix dynamique (paliers) + détail transparence ══ */}
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-green-600">
                      {formatCurrency(baseUnitPrice)}
                    </span>
                    <span className="text-sm text-gray-500">/unité</span>
                  </div>

                  {/* Détail prix — transparence */}
                  {(product.pricing.baseCost || product.pricing.fees) && (
                    <div className="mt-2 pt-2 border-t border-green-200/60 space-y-0.5 text-[11px] text-gray-500">
                      {product.pricing.baseCost && (
                        <div className="flex justify-between">
                          <span>Prix source</span>
                          <span className="text-gray-600 font-medium">{formatCurrency(product.pricing.baseCost)}</span>
                        </div>
                      )}
                      {product.pricing.fees && (
                        <>
                          <div className="flex justify-between">
                            <span>Frais de service ({product.pricing.fees.serviceFeeRate}%)</span>
                            <span className="text-gray-600 font-medium">+{formatCurrency(product.pricing.fees.serviceFeeAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Assurance ({product.pricing.fees.insuranceRate}%)</span>
                            <span className="text-gray-600 font-medium">+{formatCurrency(product.pricing.fees.insuranceAmount)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {product.priceTiers && product.priceTiers.length > 0 && (
                    <>
                      <div className="text-xs font-semibold text-gray-600 mb-2 mt-3 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5 text-green-600" />
                        Prix dégressifs
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {priceTable.map((row, idx) => {
                          const isActive = currentTotalQty >= row.qty && (!row.maxQty || currentTotalQty <= row.maxQty)
                          return (
                            <div key={idx} className={clsx("text-center p-2 rounded-lg border transition-all", isActive ? "bg-green-500 text-white border-green-500 shadow-sm" : "bg-white border-gray-200 text-gray-600")}>
                              <div className="text-[10px] font-medium opacity-80">{row.qty}{row.maxQty ? `-${row.maxQty}` : '+'} pcs</div>
                              <div className={clsx("font-bold", isActive ? "text-sm" : "text-xs")}>{formatCurrency(row.price)}</div>
                              {row.discount > 0 && <div className={clsx("text-[10px]", isActive ? "text-white/80" : "text-red-500")}>-{row.discount}%</div>}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ══ Variantes avec quantités (style 1688 compact) ══ */}
              {product.variantGroups && product.variantGroups.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm">
                  {product.variantGroups.map(group => (
                    <div key={group.name}>
                      <div className="px-4 pt-4 pb-2">
                        <h4 className="text-sm font-bold text-gray-800">{group.name}</h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {group.variants.map(variant => {
                          const qty = variantQuantities[variant.id] || 0
                          const hasQty = qty > 0
                          const price = (variant.priceFCFA && variant.priceFCFA > 0) ? variant.priceFCFA : baseUnitPrice
                          const isOutOfStock = variant.stock <= 0
                          return (
                            <div key={variant.id} className={clsx("flex items-center gap-2 px-4 py-2.5 transition-colors", hasQty ? "bg-green-50/60" : "hover:bg-gray-50")}>
                              {variant.image && (
                                <div className="relative flex-shrink-0 group/img">
                                  <div className="relative w-10 h-10 rounded overflow-hidden border border-gray-200">
                                    <Image src={variant.image} alt={variant.name} fill className="object-cover" sizes="40px" />
                                  </div>
                                  <div className="hidden group-hover/img:block absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
                                    <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-white shadow-xl bg-white">
                                      <Image src={variant.image} alt={variant.name} fill className="object-contain" sizes="160px" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 leading-tight line-clamp-2">{variant.name}</div>
                              </div>
                              <span className={clsx("text-xs font-bold whitespace-nowrap", hasQty ? "text-green-600" : "text-gray-700")}>{formatCurrency(price)}</span>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap w-16 text-right">{variant.stock > 0 ? `${variant.stock.toLocaleString('fr-FR')} en stock` : 'Épuisé'}</span>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button onClick={() => handleVariantQuantityChange(variant.id, -1)} disabled={qty === 0} className={clsx("w-6 h-6 rounded flex items-center justify-center text-lg transition", qty > 0 ? "text-green-600 hover:bg-green-100" : "text-gray-300")}>
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={qty}
                                  onChange={(e) => setVariantQuantityDirect(variant.id, parseInt(e.target.value) || 0)}
                                  disabled={isOutOfStock}
                                  className={clsx("variant-qty-input w-8 h-6 text-center text-xs font-semibold rounded p-0", hasQty ? "text-green-600" : "text-gray-700")}
                                />
                                <button onClick={() => handleVariantQuantityChange(variant.id, 1)} disabled={isOutOfStock} className={clsx("w-6 h-6 rounded flex items-center justify-center text-lg transition", !isOutOfStock ? "text-green-600 hover:bg-green-100" : "text-gray-300")}>
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ══ Transport ══ */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                  <Truck className="w-4 h-4 text-green-600" /> Mode de transport
                </h4>
                <div className="space-y-2">
                  {Object.values(shippingRates).map(rate => {
                    const Icon = getShippingIcon(rate.id)
                    const isActive = selectedShippingId === rate.id
                    return (
                      <button key={rate.id} onClick={() => setSelectedShippingId(isActive ? null : rate.id)} className={clsx("w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all", isActive ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300")}>
                        <Icon className={clsx("w-5 h-5 flex-shrink-0", isActive ? "text-green-600" : "text-gray-400")} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{rate.label}</div>
                          <div className="text-xs text-gray-500">{rate.durationDays} jours • {rate.billing === 'per_kg' ? 'par kg' : 'par m³'}</div>
                        </div>
                        <span className={clsx("text-sm font-bold", isActive ? "text-green-600" : "text-gray-700")}>{rate.rate.toLocaleString('fr-FR')} F/{rate.billing === 'per_kg' ? 'kg' : 'm³'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ══ Récapitulatif + Actions ══ */}
              <div className="bg-white rounded-xl p-5 shadow-sm">
                {/* Recap ligne */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sous-total ({variantCalculations.totalQuantity} unité{variantCalculations.totalQuantity > 1 ? 's' : ''})</span>
                    <span className="font-semibold">{formatCurrency(variantCalculations.subtotalProducts)}</span>
                  </div>
                  {shippingEstimate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Transport estimé</span>
                      <span className="font-semibold">{formatCurrency(shippingEstimate.cost)}</span>
                    </div>
                  )}
                  {(unitWeightKg || unitVolumeM3) && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Poids/Volume total</span>
                      <span>
                        {unitWeightKg && `${(unitWeightKg * variantCalculations.totalQuantity).toFixed(2)} kg`}
                        {unitWeightKg && unitVolumeM3 && ' / '}
                        {unitVolumeM3 && `${(unitVolumeM3 * variantCalculations.totalQuantity).toFixed(3)} m³`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                    <span>Total estimé</span>
                    <span className="text-green-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* Boutons */}
                <button
                  onClick={() => addToCart(true)}
                  disabled={adding || variantCalculations.totalQuantity === 0}
                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-base transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {adding ? 'Ajout en cours...' : 'Acheter maintenant'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => addToCart(false)}
                    disabled={adding || variantCalculations.totalQuantity === 0}
                    className="flex-1 py-3 border-2 border-green-500 text-green-600 rounded-xl font-semibold text-sm hover:bg-green-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Ajouter au panier
                  </button>
                  <button
                    onClick={toggleFavorite}
                    className={clsx("px-4 py-3 rounded-xl border-2 transition", isFavorite ? "border-red-300 bg-red-50 text-red-500" : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400")}
                  >
                    <Heart className={clsx("w-5 h-5", isFavorite && "fill-current")} />
                  </button>
                </div>

                {/* WhatsApp + Partage */}
                <div className="flex gap-2 mt-3">
                  <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-green-400 hover:text-green-600 transition">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                    Devis WhatsApp
                  </a>
                  <button onClick={shareProduct} className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-green-400 hover:text-green-600 transition">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ══ Achat groupé ══ */}
              {product.groupBuyEnabled && (
                <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-5 text-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5" />
                    <span className="font-bold">Achat groupé disponible</span>
                  </div>
                  <p className="text-sm text-white/90 mb-3">
                    Jusqu&apos;à {product.groupBuyDiscount}% de réduction en achat groupé
                  </p>
                  <Link href={`/achats-groupes?product=${product.id}`} className="block w-full py-2.5 bg-white text-green-600 rounded-lg text-center font-bold text-sm hover:bg-green-50 transition">
                    Rejoindre un groupe
                  </Link>
                </div>
              )}

              {/* ══ Fournisseur ══ */}
              {product.supplier && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Store className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{product.supplier.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />{product.supplier.location}
                      </div>
                    </div>
                    {product.supplier.verified && <BadgeCheck className="w-5 h-5 text-green-500 ml-auto" />}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-900">{product.supplier.yearsInBusiness} ans</div>
                      <div>Ancienneté</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-900">{product.supplier.rating}/5</div>
                      <div>Note</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-900">{product.supplier.transactions}+</div>
                      <div>Ventes</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ Trust badges ══ */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-2 text-xs text-center text-gray-500">
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Package className="w-5 h-5 text-green-500" />
                    <span>Qualité garantie</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Truck className="w-5 h-5 text-green-500" />
                    <span>Suivi expédition</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ═══ Modal image plein écran ═══ */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowImageModal(false)}
          >
            <button className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 z-10" onClick={() => setShowImageModal(false)}>
              <X className="w-6 h-6" />
            </button>
            {/* Navigation */}
            {gallery.length > 1 && (
              <>
                <button onClick={() => setActiveImageIndex(i => i > 0 ? i - 1 : gallery.length - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button onClick={() => setActiveImageIndex(i => i < gallery.length - 1 ? i + 1 : 0)} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </>
            )}
            <div className="relative w-full max-w-5xl h-[85vh]" onClick={e => e.stopPropagation()}>
              <Image src={gallery[activeImageIndex] || '/file.svg'} alt={product.name} fill className="object-contain" sizes="100vw" priority />
            </div>
            {/* Thumbnails en bas */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {gallery.map((img, idx) => (
                <button key={idx} onClick={() => setActiveImageIndex(idx)} className={clsx("relative w-12 h-12 rounded-lg overflow-hidden border-2 transition", activeImageIndex === idx ? "border-green-400 opacity-100" : "border-white/30 opacity-50 hover:opacity-80")}>
                  <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
