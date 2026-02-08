'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  ExternalLink,
  FileDown,
  Loader2,
  MessageCircle,
  Plane,
  Play,
  Share2,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  X,
  ZoomIn,
  Heart,
  Package,
  TruckIcon,
  Info,
  Megaphone,
  Users,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Building2,
  MapPin,
  BadgeCheck,
  TrendingUp,
  Copy,
  MessageSquare,
  Phone,
  Store,
  Globe,
  Award,
  ThumbsUp,
  Eye
} from 'lucide-react'
import { trackEvent } from '@/utils/analytics'

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
  
  const isVideoUrl = (url: string) => {
    if (!url) return false
    return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)
  }

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    product.variantGroups?.forEach(group => {
      const defaultVar = group.variants.find(v => v.isDefault) || group.variants[0]
      if (defaultVar) initial[group.name] = defaultVar.id
    })
    return initial
  })
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'specs' | 'description' | 'shipping' | 'reviews'>('specs')
  const [showImageModal, setShowImageModal] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const imageRef = useRef<HTMLDivElement>(null)

  const gallery = useMemo(() => {
    const variantImage = 
      product.variantGroups
        ?.flatMap(g => g.variants)
        .find(v => Object.values(selectedVariants).includes(v.id))?.image
    
    if (variantImage && !baseGallery.includes(variantImage)) {
      return [variantImage, ...baseGallery]
    }
    return baseGallery
  }, [selectedVariants, product.variantGroups, baseGallery])

  // Calcul prix selon quantité (style 1688)
  const getPriceForQty = (qty: number) => {
    if (!product.priceTiers || product.priceTiers.length === 0) {
      return product.pricing.salePrice || 0
    }
    const tier = product.priceTiers.find(t => 
      qty >= t.minQty && (!t.maxQty || qty <= t.maxQty)
    )
    return tier?.price || product.pricing.salePrice || 0
  }

  const currentPrice = getPriceForQty(quantity)
  const totalPrice = currentPrice * quantity

  // Prix dégressifs pour affichage
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }

  const addToCart = () => {
    // Implementation du panier
    trackEvent('add_to_cart', { productId: product.id, quantity })
    window.dispatchEvent(new CustomEvent('cart:updated'))
  }

  const shareProduct = () => {
    const text = encodeURIComponent(
      `🔥 ${product.name}\n` +
      `💰 À partir de ${formatCurrency(product.pricing.salePrice)}\n` +
      `📦 MOQ: ${product.priceTiers?.[0]?.minQty || 1} unités\n` +
      `${window.location.href}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header minimal style 1688 */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/produits" className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Retour au catalogue</span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={shareProduct} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-violet-500 text-white rounded-lg hover:from-green-600 hover:to-violet-600 transition font-medium">
              <MessageCircle className="w-4 h-4" />
              <span>Contacter le fournisseur</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-green-600">Accueil</Link>
          <span>&gt;</span>
          <Link href="/produits" className="hover:text-green-600">Produits</Link>
          {product.category && (
            <>
              <span>&gt;</span>
              <span className="text-gray-900 font-medium">{product.category}</span>
            </>
          )}
        </nav>

        {/* Layout principal 1688 style */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Colonne gauche: Images */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              {/* Image principale avec zoom */}
              <div 
                ref={imageRef}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in group"
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
                onClick={() => setShowImageModal(true)}
              >
                <Image
                  src={gallery[activeImageIndex] || '/file.svg'}
                  alt={product.name}
                  fill
                  className={clsx(
                    "object-contain p-4 transition-transform duration-200",
                    isZoomed && "scale-150"
                  )}
                  style={isZoomed ? {
                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                  } : undefined}
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                />
                
                {/* Badge import */}
                {product.isImported && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-green-500 to-violet-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Import Chine
                  </div>
                )}

                {/* Zoom indicator */}
                <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <ZoomIn className="w-3 h-3" />
                  Zoom
                </div>
              </div>

              {/* Thumbnails */}
              {gallery.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={clsx(
                        "relative w-16 h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden transition",
                        activeImageIndex === idx 
                          ? "border-green-500 ring-2 ring-green-200" 
                          : "border-gray-200 hover:border-green-300"
                      )}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info fournisseur style 1688 */}
            {product.supplier && (
              <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Store className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{product.supplier.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {product.supplier.location}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <BadgeCheck className={clsx("w-4 h-4", product.supplier.verified ? "text-green-500" : "text-gray-400")} />
                    {product.supplier.verified ? "Fournisseur vérifié" : "Non vérifié"}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-blue-500" />
                    {product.supplier.yearsInBusiness} ans
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {product.supplier.rating}/5
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    {product.supplier.transactions}+ transactions
                  </div>
                </div>

                <button className="w-full mt-3 py-2 border-2 border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-50 transition flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Voir le profil fournisseur
                </button>
              </div>
            )}
          </div>

          {/* Colonne centrale: Infos produit */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              {/* Titre */}
              <h1 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {product.tagline && (
                <p className="text-gray-500 text-sm mb-4">{product.tagline}</p>
              )}

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                  <span className="ml-1 text-gray-600">4.8</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">128 avis</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">356 vendus</span>
              </div>

              {/* Prix style 1688 - Tableau dégressif */}
              <div className="bg-gradient-to-br from-green-50 to-violet-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  Prix selon quantité
                </h3>
                <div className="space-y-2">
                  {priceTable.map((row, idx) => (
                    <div 
                      key={idx}
                      className={clsx(
                        "flex items-center justify-between p-2 rounded-lg text-sm",
                        quantity >= row.qty && (!row.maxQty || quantity <= row.maxQty)
                          ? "bg-gradient-to-r from-green-500 to-violet-500 text-white"
                          : "bg-white text-gray-700"
                      )}
                    >
                      <span>
                        {row.qty}{row.maxQty ? `-${row.maxQty}` : '+'} unités
                      </span>
                      <div className="flex items-center gap-2">
                        {row.discount > 0 && (
                          <span className={clsx(
                            "text-xs px-2 py-0.5 rounded",
                            quantity >= row.qty && (!row.maxQty || quantity <= row.maxQty)
                              ? "bg-white/20"
                              : "bg-red-100 text-red-600"
                          )}>
                            -{row.discount}%
                          </span>
                        )}
                        <span className="font-bold">{formatCurrency(row.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sélection variante style 1688 */}
              {product.variantGroups?.map(group => (
                <div key={group.name} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{group.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {group.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariants(prev => ({ ...prev, [group.name]: variant.id }))}
                        className={clsx(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition",
                          selectedVariants[group.name] === variant.id
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-green-300"
                        )}
                      >
                        {variant.image && (
                          <Image
                            src={variant.image}
                            alt={variant.name}
                            width={32}
                            height={32}
                            className="rounded object-cover"
                          />
                        )}
                        <span>{variant.name}</span>
                        {variant.stock < 10 && (
                          <span className="text-xs text-red-500">(Stock limité)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantité style 1688 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Quantité</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border-2 border-gray-200 rounded-lg">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 hover:bg-gray-100 border-r-2 border-gray-200"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center py-2 font-semibold"
                    />
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 hover:bg-gray-100 border-l-2 border-gray-200"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    Stock: {product.availability.stockQuantity} unités
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4 mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-green-600">
                    {formatCurrency(totalPrice)}
                  </span>
                  <span className="text-gray-500">pour {quantity} unité(s)</span>
                </div>
                <p className="text-xs text-gray-400">
                  * Prix hors transport. Transport calculé au panier selon poids/volume.
                </p>
              </div>

              {/* Actions principales style 1688 */}
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 border-2 border-violet-500 text-violet-600 rounded-lg font-bold hover:bg-violet-50 transition flex items-center justify-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Négocier
                </button>
                <button 
                  onClick={addToCart}
                  className="py-3 bg-gradient-to-r from-green-500 to-violet-500 text-white rounded-lg font-bold hover:from-green-600 hover:to-violet-600 transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Ajouter au panier
                </button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-center text-gray-500">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <span>Paiement sécurisé</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Package className="w-5 h-5 text-blue-500" />
                  <span>Qualité garantie</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span>Livraison 15-60j</span>
                </div>
              </div>
            </div>

            {/* Logistique rapide */}
            <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-600" />
                Options de transport
              </h3>
              <div className="space-y-2">
                {product.pricing.shippingOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      {opt.id.includes('sea') ? <Ship className="w-4 h-4 text-blue-500" /> : 
                       opt.id.includes('express') ? <Plane className="w-4 h-4 text-purple-500" /> : 
                       <Plane className="w-4 h-4 text-green-500" />}
                      <span>{opt.label}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(opt.cost || opt.baseCost)}/kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colonne droite: Sidebar sticky */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-20 space-y-4">
            {/* Carte sécurité */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Protection acheteur</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-gray-600">Paiement sécurisé</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-gray-600">Garantie qualité</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-gray-600">Remboursement si non conforme</span>
                </li>
              </ul>
            </div>

            {/* Achat groupé */}
            {product.groupBuyEnabled && (
              <div className="bg-gradient-to-br from-green-500 to-violet-500 rounded-xl p-4 text-white mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="font-bold">Achat groupé actif!</span>
                </div>
                <p className="text-sm text-white/90 mb-2">
                  Rejoignez {product.groupBuyMinQty} acheteurs pour 
                  {formatCurrency(product.groupBuyBestPrice)} /unité
                </p>
                <Link 
                  href={`/achats-groupes?product=${product.id}`}
                  className="block w-full py-2 bg-white text-green-600 rounded-lg text-center font-bold text-sm hover:bg-green-50 transition"
                >
                  Voir les achats groupés
                </Link>
              </div>
            )}

            {/* Produits similaires mini */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Produits similaires</h3>
              <div className="space-y-3">
                {similar.slice(0, 3).map(item => (
                  <Link 
                    key={item.id}
                    href={`/produits/${item.id}`}
                    className="flex gap-3 group"
                  >
                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image || '/file.svg'}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-green-600 transition">
                        {item.name}
                      </h4>
                      <p className="text-green-600 font-bold text-sm">
                        {formatCurrency(item.priceAmount) || 'Sur devis'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Onglets style 1688 */}
        <div className="mt-8 bg-white rounded-xl shadow-sm">
          <div className="flex border-b">
            {[
              { id: 'specs', label: 'Spécifications' },
              { id: 'description', label: 'Description' },
              { id: 'shipping', label: 'Expédition' },
              { id: 'reviews', label: `Avis (${128})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "flex-1 py-4 text-sm font-medium border-b-2 transition",
                  activeTab === tab.id
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'specs' && (
              <div className="grid md:grid-cols-2 gap-4">
                {product.features.filter(Boolean).map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
                {product.logistics.dimensions && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Package className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      Dimensions: {product.logistics.dimensions.lengthCm} × {product.logistics.dimensions.widthCm} × {product.logistics.dimensions.heightCm} cm
                    </span>
                  </div>
                )}
                {product.logistics.weightKg && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Poids: {product.logistics.weightKg} kg</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'description' && (
              <div className="max-w-none">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: parseMarkdown(product.description) }} />
                ) : (
                  <p className="text-gray-500">Description détaillée disponible sur demande.</p>
                )}
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-4">
                <p className="text-gray-700">Options de transport disponibles:</p>
                <div className="grid md:grid-cols-3 gap-4">
                  {product.pricing.shippingOptions.map((opt, idx) => (
                    <div key={idx} className="p-4 border-2 border-gray-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        {opt.id.includes('sea') ? <Ship className="w-5 h-5 text-blue-500" /> : 
                         opt.id.includes('express') ? <Plane className="w-5 h-5 text-purple-500" /> : 
                         <Plane className="w-5 h-5 text-green-500" />}
                        <span className="font-bold">{opt.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(opt.cost || opt.baseCost)}</p>
                      <p className="text-sm text-gray-500">par kg</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="text-4xl font-bold text-green-600">4.8</div>
                  <div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <p className="text-sm text-gray-500">128 avis vérifiés</p>
                  </div>
                </div>
                <p className="text-gray-500">Les avis sont vérifiés par notre équipe.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal image plein écran */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowImageModal(false)}
          >
            <button 
              className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-5xl h-[80vh]" onClick={e => e.stopPropagation()}>
              <Image
                src={gallery[activeImageIndex] || '/file.svg'}
                alt={product.name}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {gallery.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={clsx(
                    "w-2 h-2 rounded-full transition",
                    activeImageIndex === idx ? "bg-white" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
