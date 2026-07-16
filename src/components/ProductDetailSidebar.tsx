'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Heart,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Truck,
  Plane,
  Ship,
  Info,
  Users,
  TrendingDown,
  Check,
  Package,
  Shield,
  Sparkles,
  Minus,
  Plus,
  Scale,
  ZoomIn,
  CheckCircle,
  X,
  Clock,
  Target,
  Zap,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import type { ProductDetailData, ProductVariant, ProductVariantGroup } from './ProductDetailExperience'
import type { ShippingOptionPricing } from '@/lib/logistics'
import { BASE_SHIPPING_RATES, type ShippingMethodId, type ShippingRate } from '@/lib/logistics'
import { trackEvent } from '@/utils/analytics'
import ProductPricing1688 from './ProductPricing1688'

// ─────────────────────────────────────────────────────────────────────────────
// Types & Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ProductDetailSidebarProps {
  product: ProductDetailData
  selectedVariants: Record<string, string>
  onVariantChange: (groupName: string, variantId: string) => void
  onImageChange?: (imageUrl: string) => void
  onOpenNegotiation: () => void
}

type GroupOrderSummary = {
  groupId: string
  status: string
  minQty: number
  targetQty: number
  currentQty: number
  currentUnitPrice: number
  deadline: string
}

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

const getShippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  if (methodId.includes('truck')) return Truck
  return Plane
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductDetailSidebar({
  product,
  selectedVariants,
  onVariantChange,
  onImageChange,
  onOpenNegotiation,
}: ProductDetailSidebarProps) {
  const [shippingRates, setShippingRates] = useState<Record<ShippingMethodId, ShippingRate>>(BASE_SHIPPING_RATES)

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(d => {
        if (d?.success && d?.rates) setShippingRates(d.rates)
      })
      .catch(() => {
        // fallback: BASE_SHIPPING_RATES
      })
  }, [])
  // ─── State ─────────────────────────────────────────────────────────────────
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showPriceDetails, setShowPriceDetails] = useState(false)
  const [showTransportModal, setShowTransportModal] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [wantsInstallation, setWantsInstallation] = useState(false)
  const [showGroupBuyModal, setShowGroupBuyModal] = useState(false)
  const [groupBuyQty, setGroupBuyQty] = useState(1)
  const [groupOrders, setGroupOrders] = useState<GroupOrderSummary[]>([])
  const [groupOrdersLoading, setGroupOrdersLoading] = useState(false)
  // Image zoomée (pour preview au survol et clic)
  const [hoveredVariantImage, setHoveredVariantImage] = useState<string | null>(null)
  const [imageZoomPosition, setImageZoomPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  // ─── Computed Values ───────────────────────────────────────────────────────

  // Poids unitaire du produit
  const unitWeightKg = useMemo(() => {
    return product?.weights?.netWeightKg ?? product?.logistics?.weightKg ?? null
  }, [product])

  // Volume unitaire du produit
  const unitVolumeM3 = useMemo(() => {
    return product?.logistics?.volumeM3 ?? null
  }, [product])

  // Quantité totale = quantité unique (la combinaison sélectionnée est UN article)
  const currentTotalQty = quantity

  // Prix unitaire basé sur les paliers (tiered pricing)
  const tieredUnitPrice = useMemo(() => {
    if (!product.priceTiers || product.priceTiers.length === 0) return null
    // Trier par minQty décroissant
    const sorted = [...product.priceTiers].sort((a, b) => b.minQty - a.minQty)
    const tier = sorted.find(t => currentTotalQty >= t.minQty)
    return tier ? tier.price : null
  }, [product.priceTiers, currentTotalQty])

  // Calcul du prix de base (hors variantes)
  const baseUnitPrice = useMemo(() => {
    if (tieredUnitPrice !== null) return tieredUnitPrice
    return product.pricing.totalWithFees ?? product.pricing.salePrice ?? 0
  }, [product.pricing.totalWithFees, product.pricing.salePrice, tieredUnitPrice])

  const groupBuyHeadline = useMemo(() => {
    const d = product.groupBuyDiscount
    if (typeof d === 'number' && Number.isFinite(d) && d > 0) return `Jusqu'à -${d}% en groupe`
    return "Prix dégressifs en groupe"
  }, [product.groupBuyDiscount])

  const bestGroupBuyUnitPrice = useMemo(() => {
    if (typeof product.groupBuyBestPrice === 'number' && Number.isFinite(product.groupBuyBestPrice)) return product.groupBuyBestPrice
    if (product.priceTiers && product.priceTiers.length > 0) {
      const best = Math.min(...product.priceTiers.map(t => (typeof t?.price === 'number' ? t.price : Number.POSITIVE_INFINITY)))
      return Number.isFinite(best) ? best : null
    }
    return null
  }, [product.groupBuyBestPrice, product.priceTiers])

  const daysLeft = useCallback((deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [])

  const primaryGroup = useMemo(() => {
    if (!groupOrders || groupOrders.length === 0) return null
    // API /api/group-orders is already sorted (deadline asc, currentQty desc)
    return groupOrders[0]
  }, [groupOrders])

  useEffect(() => {
    const load = async () => {
      if (!product.groupBuyEnabled) return
      if (!product.id) return
      setGroupOrdersLoading(true)
      try {
        const res = await fetch(`/api/group-orders?productId=${encodeURIComponent(product.id)}&limit=3`)
        const data = await res.json()
        if (data?.success && Array.isArray(data.groups)) {
          setGroupOrders(
            data.groups.map((g: any) => ({
              groupId: g.groupId,
              status: g.status,
              minQty: g.minQty,
              targetQty: g.targetQty,
              currentQty: g.currentQty,
              currentUnitPrice: g.currentUnitPrice,
              deadline: g.deadline
            }))
          )
        } else {
          setGroupOrders([])
        }
      } catch (e) {
        setGroupOrders([])
      } finally {
        setGroupOrdersLoading(false)
      }
    }

    load()
  }, [product.groupBuyEnabled, product.id])

  // Variantes sélectionnées (une par groupe) + prix effectif unique de la combinaison
  // Règle : si une variante définit un priceFCFA > 0, on prend le MAX parmi celles
  // sélectionnées. Sinon fallback au baseUnitPrice. La combinaison = 1 seul article.
  const variantCalculations = useMemo(() => {
    const selectedList: Array<{ groupName: string; variant: ProductVariant }> = []
    let priceFromVariants: number | null = null

    for (const group of product.variantGroups ?? []) {
      const selectedId = selectedVariants[group.name]
      if (!selectedId) continue
      const variant = group.variants.find(v => v.id === selectedId)
      if (!variant) continue
      selectedList.push({ groupName: group.name, variant })
      if (typeof variant.priceFCFA === 'number' && variant.priceFCFA > 0) {
        priceFromVariants = Math.max(priceFromVariants ?? 0, variant.priceFCFA)
      }
    }

    const hasVariantSelection = selectedList.length > 0
    const unitPrice = priceFromVariants ?? baseUnitPrice
    const totalQuantity = quantity
    const subtotalProducts = unitPrice * totalQuantity

    return {
      totalQuantity,
      subtotalProducts,
      unitPrice,
      hasVariantSelection,
      // Conservé pour compatibilité d'affichage (qty = quantité globale, price = prix unitaire de la combinaison)
      selectedVariantsList: selectedList.map(({ variant }) => ({ variant, qty: totalQuantity, price: unitPrice }))
    }
  }, [selectedVariants, quantity, baseUnitPrice, product.variantGroups])

  // Calcul du transport estimé
  const shippingEstimate = useMemo(() => {
    if (!selectedShippingId) return null
    
    if (!shippingRates) return null
    const rate = shippingRates[selectedShippingId as ShippingMethodId]
    if (!rate) return null

    const totalQty = variantCalculations.totalQuantity

    if (rate.billing === 'per_kg' && unitWeightKg) {
      const totalWeight = unitWeightKg * totalQty
      const shippingCost = Math.max(totalWeight * rate.rate, rate.minimumCharge || 0)
      return {
        cost: shippingCost,
        label: `${totalWeight.toFixed(2)} kg × ${rate.rate.toLocaleString('fr-FR')} FCFA/kg`,
        method: rate.label
      }
    }

    if (rate.billing === 'per_cubic_meter' && unitVolumeM3) {
      const totalVolume = unitVolumeM3 * totalQty
      const shippingCost = Math.max(totalVolume * rate.rate, rate.minimumCharge || 0)
      return {
        cost: shippingCost,
        label: `${totalVolume.toFixed(3)} m³ × ${rate.rate.toLocaleString('fr-FR')} FCFA/m³`,
        method: rate.label
      }
    }

    return null
  }, [selectedShippingId, variantCalculations.totalQuantity, unitWeightKg, unitVolumeM3, shippingRates])

  // Total général (produits + transport)
  const grandTotal = useMemo(() => {
    const productTotal = variantCalculations.subtotalProducts
    const shippingCost = shippingEstimate?.cost ?? 0
    return productTotal + shippingCost
  }, [variantCalculations.subtotalProducts, shippingEstimate])

  // Shipping option sélectionnée
  const activeShipping = useMemo(() => {
    if (!selectedShippingId) return null
    const rate = shippingRates[selectedShippingId as ShippingMethodId]
    return rate ?? null
  }, [selectedShippingId, shippingRates])

  // Variante courante (pour affichage)
  const currentVariant = useMemo(() => {
    if (!product.variantGroups) return null
    for (const group of product.variantGroups) {
      const selectedId = selectedVariants[group.name]
      const variant = group.variants.find(v => v.id === selectedId)
      if (variant) return { group: group.name, variant }
    }
    return null
  }, [product.variantGroups, selectedVariants])

  const showQuote = product.requiresQuote || baseUnitPrice === 0

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Charger les favoris
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      setIsFavorite(favorites.includes(product.id))
    } catch {
      setIsFavorite(false)
    }
  }, [product.id])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleQuantityChange = useCallback((value: number) => {
    if (!Number.isFinite(value)) return
    setQuantity(Math.max(1, Math.round(value)))
  }, [])

  const handleVariantSelect = useCallback((groupName: string, variant: ProductVariant) => {
    // Style AliExpress : une seule option par groupe — toggle off si déjà sélectionnée
    const wasSelected = selectedVariants[groupName] === variant.id
    onVariantChange(groupName, wasSelected ? '' : variant.id)
    // Si la variante a une image, notifier le parent
    if (!wasSelected && variant.image && onImageChange) {
      onImageChange(variant.image)
    }
  }, [onVariantChange, onImageChange, selectedVariants])

  // Gérer le survol d'image - zoom après délai
  const handleImageHover = useCallback((e: React.MouseEvent, imageUrl: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setImageZoomPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top + rect.height / 2 
    })
    // Ouvrir le zoom après 500ms de survol
    const timeout = setTimeout(() => {
      setHoveredVariantImage(imageUrl)
    }, 500)
    setHoverTimeout(timeout)
  }, [])

  const handleImageClick = useCallback((e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation()
    // Annuler le timeout du survol si présent
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setImageZoomPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top + rect.height / 2 
    })
    setHoveredVariantImage(imageUrl)
  }, [hoverTimeout])

  const handleImageLeave = useCallback(() => {
    // Annuler le timeout si on quitte avant le délai
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    setImageZoomPosition(null)
  }, [hoverTimeout])

  const addToCart = useCallback((redirect = false) => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return

      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const currency = product.pricing.currency

      // Si des variantes sont sélectionnées : UN SEUL item combiné (taille + couleur = 1 article)
      if (variantCalculations.hasVariantSelection) {
        const variantList = variantCalculations.selectedVariantsList
        const variantIdsKey = variantList.map(v => v.variant.id).sort().join('+')
        const id = `${product.id}-${variantIdsKey}${shippingKey}`
        const combinedLabel = variantList.map(v => v.variant.name).join(' · ')
        const price = variantCalculations.unitPrice
        const qty = variantCalculations.totalQuantity
        const existsIndex = items.findIndex((item: any) => item.id === id)

        if (existsIndex >= 0) {
          items[existsIndex].qty += qty
          items[existsIndex].price = price
          items[existsIndex].currency = currency
        } else {
          const newItem: any = {
            id,
            name: `${product.name} — ${combinedLabel}`,
            qty,
            price,
            currency,
            requiresQuote: !!product.requiresQuote,
            variantIds: variantList.map(v => v.variant.id),
            variantLabels: variantList.map(v => v.variant.name),
            unitWeightKg: unitWeightKg ?? undefined,
            unitVolumeM3: unitVolumeM3 ?? undefined,
          }

          if (activeShipping) {
            newItem.shipping = {
              id: activeShipping.id,
              label: activeShipping.label,
              durationDays: activeShipping.durationDays,
              rate: activeShipping.rate,
            }
          }

          if (product.pricing.fees) {
            newItem.serviceFeeRate = product.pricing.fees.serviceFeeRate
            newItem.serviceFeeAmount = product.pricing.fees.serviceFeeAmount
            newItem.insuranceRate = product.pricing.fees.insuranceRate
            newItem.insuranceAmount = product.pricing.fees.insuranceAmount
          }

          items.push(newItem)
        }
      } else {
        // Ajouter sans variante spécifique
        const id = `${product.id}${shippingKey}`
        const existsIndex = items.findIndex((item: any) => item.id === id)
        const price = baseUnitPrice

        if (existsIndex >= 0) {
          items[existsIndex].qty += quantity
          items[existsIndex].price = price
          items[existsIndex].currency = currency
        } else {
          const newItem: any = {
            id,
            name: product.name,
            qty: quantity,
            price,
            currency,
            requiresQuote: !!product.requiresQuote,
            unitWeightKg: unitWeightKg ?? undefined,
            unitVolumeM3: unitVolumeM3 ?? undefined,
          }

          if (activeShipping) {
            newItem.shipping = {
              id: activeShipping.id,
              label: activeShipping.label,
              durationDays: activeShipping.durationDays,
              rate: activeShipping.rate,
            }
          }

          if (product.pricing.fees) {
            newItem.serviceFeeRate = product.pricing.fees.serviceFeeRate
            newItem.serviceFeeAmount = product.pricing.fees.serviceFeeAmount
            newItem.insuranceRate = product.pricing.fees.insuranceRate
            newItem.insuranceAmount = product.pricing.fees.insuranceAmount
          }

          items.push(newItem)
        }
      }

      window.localStorage.setItem('cart:items', JSON.stringify(items))
      const analyticsValue = variantCalculations.hasVariantSelection
        ? variantCalculations.unitPrice * variantCalculations.totalQuantity
        : baseUnitPrice * quantity
      const analyticsItems = variantCalculations.hasVariantSelection
        ? variantCalculations.selectedVariantsList.map(({ variant }: any) => ({
            item_id: `${product.id}-${variant.id}`,
            item_name: `${product.name} — ${variant.name}`,
            item_category: product.category || undefined,
            price: variantCalculations.unitPrice,
            quantity: variantCalculations.totalQuantity,
          }))
        : [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.category || undefined,
            price: baseUnitPrice,
            quantity,
          }]
      trackEvent('add_to_cart', {
        currency: product.pricing.currency,
        value: analyticsValue,
        items: analyticsItems,
        quantity: variantCalculations.totalQuantity,
      })
      window.dispatchEvent(new CustomEvent('cart:updated'))

      if (redirect) {
        setTimeout(() => {
          window.location.href = '/panier'
        }, 200)
      }
    } finally {
      setAdding(false)
    }
  }, [product, quantity, baseUnitPrice, activeShipping, variantCalculations, unitWeightKg, unitVolumeM3])

  const toggleFavorite = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      if (isFavorite) {
        const updated = favorites.filter((id: string) => id !== product.id)
        localStorage.setItem('wishlist:items', JSON.stringify(updated))
        setIsFavorite(false)
        trackEvent('remove_from_wishlist', { productId: product.id })
      } else {
        favorites.push(product.id)
        localStorage.setItem('wishlist:items', JSON.stringify(favorites))
        setIsFavorite(true)
        trackEvent('add_to_wishlist', { productId: product.id })
      }
      window.dispatchEvent(new CustomEvent('wishlist:updated'))
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }, [isFavorite, product.id])

  const whatsappUrl = () => {
    const variantInfo = variantCalculations.hasVariantSelection 
      ? `\nVariante: ${variantCalculations.selectedVariantsList.map(v => v.variant.name).join(' · ')}`
      : ''
    const transportInfo = activeShipping ? `\nTransport: ${activeShipping.label}` : ''
    const message = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${product.name}.${variantInfo}${transportInfo}
Quantité totale: ${variantCalculations.totalQuantity}.
Merci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${message}`
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ═══════════════════════════════════════════════════════════════════════
          ZOOM IMAGE AU SURVOL (OVERLAY)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {hoveredVariantImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setHoveredVariantImage(null)}
          >
            <motion.div
              initial={{ 
                y: 20,
                x: imageZoomPosition?.x ? imageZoomPosition.x - window.innerWidth / 2 : 0,
                scale: 0.3
              }}
              animate={{ y: 0, x: 0, scale: 1 }}
              exit={{ 
                y: 20,
                x: imageZoomPosition?.x ? imageZoomPosition.x - window.innerWidth / 2 : 0,
                scale: 0.3
              }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl bg-white"
            >
              <div className="relative p-4">
                <Image
                  src={hoveredVariantImage}
                  alt="Aperçu variante - Cliquez pour fermer"
                  width={600}
                  height={600}
                  className="object-contain w-full h-auto max-h-[75vh] rounded-xl"
                  priority
                />
                <div className="absolute top-6 right-6">
                  <button
                    onClick={() => setHoveredVariantImage(null)}
                    className="w-10 h-10 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-black transition-colors shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <p className="text-sm text-gray-600 text-center">
                      Cliquez n'importe où pour fermer
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          1. PRIX PRINCIPAL + TRANSPARENCE DES FRAIS
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-green-50 via-white to-violet-50 rounded-2xl p-5 border border-green-100 shadow-sm">
        {/* Badge transparence */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
            <Shield className="h-3 w-3" />
            Prix sans frais cachés
          </span>
        </div>

        {/* Prix principal */}
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-4xl font-extrabold text-green-600">
            {baseUnitPrice > 0 ? formatCurrency(baseUnitPrice, product.pricing.currency) : 'Sur devis'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Prix unitaire estimé – hors transport</p>

        {/* ══ PRIX DÉGRESSIFS (TIERS) ══ */}
        {product.priceTiers && product.priceTiers.length > 0 && (
          <div className="mb-4 bg-white/50 rounded-lg p-3 text-xs border border-green-100/50">
            <div className="flex items-center gap-1.5 font-semibold text-green-800 mb-2">
              <TrendingDown className="h-3.5 w-3.5" />
              Prix dégressifs disponibles :
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...product.priceTiers].sort((a, b) => a.minQty - b.minQty).map((tier, idx) => {
                const isCurrent = currentTotalQty >= tier.minQty && 
                  (!product.priceTiers![idx + 1] || currentTotalQty < product.priceTiers![idx + 1].minQty)
                
                return (
                  <div key={tier.minQty} className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
                    isCurrent
                      ? "bg-green-100 border-green-300 text-green-900 shadow-sm ring-1 ring-green-200"
                      : "bg-white border-gray-100 text-gray-500"
                  )}>
                    <div className="text-[10px] font-medium opacity-80 mb-0.5">
                      {tier.minQty}{tier.maxQty ? `-${tier.maxQty}` : '+'} pcs
                    </div>
                    <div className={clsx("font-bold", isCurrent ? "text-sm" : "text-xs")}>
                      {formatCurrency(tier.price, product.pricing.currency)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ DÉTAIL DES FRAIS - TOUJOURS VISIBLE ══ */}
        {product.pricing.fees && (
          <div className="border-t border-green-100 pt-3 space-y-2">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Détail du prix (transparence totale)
            </div>
            
            {/* Prix de base produit */}
            {product.pricing.baseCost !== null && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Prix produit (sourcing)</span>
                <span className="font-medium">{formatCurrency(product.pricing.baseCost, product.pricing.currency)}</span>
              </div>
            )}
            
            {/* Frais de service - BIEN VISIBLE */}
            <div className="flex justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                Frais de service
                <span className="text-xs text-gray-400">({product.pricing.fees.serviceFeeRate}%)</span>
              </span>
              <span className="font-medium text-blue-600">
                +{formatCurrency(product.pricing.fees.serviceFeeAmount, product.pricing.currency)}
              </span>
            </div>
            
            {/* Assurance - BIEN VISIBLE */}
            <div className="flex justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                Assurance marchandise
                <span className="text-xs text-gray-400">({product.pricing.fees.insuranceRate}%)</span>
              </span>
              <span className="font-medium text-blue-600">
                +{formatCurrency(product.pricing.fees.insuranceAmount, product.pricing.currency)}
              </span>
            </div>
            
            {/* Ligne de total */}
            <div className="flex justify-between font-semibold text-gray-800 pt-2 mt-2 border-t border-dashed border-gray-200">
              <span>Total produit (hors transport)</span>
              <span className="text-green-600">{formatCurrency(baseUnitPrice, product.pricing.currency)}</span>
            </div>
          </div>
        )}

        {/* Note transport */}
        <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700 flex items-start gap-1">
            <Truck className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Transport calculé séparément selon le poids/volume total au récapitulatif.</span>
          </p>
        </div>

        {/* Accordion pour détails avancés (marge, etc.) */}
        <button
          type="button"
          onClick={() => setShowPriceDetails(!showPriceDetails)}
          className="mt-3 text-xs text-gray-500 hover:text-green-600 font-medium flex items-center gap-1"
        >
          {showPriceDetails ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Masquer les détails avancés
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Voir les détails avancés (marge, sourcing...)
            </>
          )}
        </button>

        <AnimatePresence>
          {showPriceDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Marge & sourcing</span>
                  <span>+{(product.pricing.marginRate * 100).toFixed(0)}%</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Cette marge couvre la recherche fournisseur, le contrôle qualité, et la coordination logistique.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. SÉLECTEUR DE VARIANTES (STYLE ALIEXPRESS - PASTILLES)
          ═══════════════════════════════════════════════════════════════════════ */}
      {product.variantGroups && product.variantGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {product.variantGroups.map((group) => (
            <div key={group.name}>
              <div className="text-sm font-medium text-gray-700 mb-2">
                {group.name}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.variants.map((variant) => {
                  const isOutOfStock = variant.stock === 0
                  const isSelected = selectedVariants[group.name] === variant.id

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleVariantSelect(group.name, variant)}
                      className={clsx(
                        'relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200',
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : isOutOfStock
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50/30',
                      )}
                    >
                      {/* Mini image pour les variantes avec image (couleurs) */}
                      {variant.image && (
                        <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={variant.image}
                            alt={variant.name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      )}
                      <span className="font-medium whitespace-nowrap">{variant.name}</span>
                      {/* Checkmark si sélectionné */}
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Quantité globale de la combinaison sélectionnée */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">Quantité</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold text-gray-800">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {formatCurrency(variantCalculations.unitPrice, 'FCFA')} / unité
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          3. TRANSPORT (Bouton → Accordion/Modal)
          ═══════════════════════════════════════════════════════════════════════ */}
      {product.pricing.shippingOptions.length > 0 && product.availability.status !== 'in_stock' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTransportModal(!showTransportModal)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-800">
                  {selectedShippingId 
                    ? `Transport : ${activeShipping?.label}`
                    : 'Choisir le mode de transport'
                  }
                </div>
                <div className="text-xs text-gray-500">
                  Coût exact calculé au récapitulatif
                </div>
              </div>
            </div>
            <ChevronDown className={clsx(
              'h-5 w-5 text-gray-400 transition-transform',
              showTransportModal && 'rotate-180'
            )} />
          </button>

          <AnimatePresence>
            {showTransportModal && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-2">
                  {/* Options de transport */}
                  {Object.values(shippingRates).map((rate) => {
                    const Icon = getShippingIcon(rate.id)
                    const isSelected = selectedShippingId === rate.id

                    return (
                      <button
                        key={rate.id}
                        type="button"
                        onClick={() => setSelectedShippingId(isSelected ? null : rate.id)}
                        className={clsx(
                          'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={clsx(
                            'h-5 w-5',
                            isSelected ? 'text-blue-600' : 'text-gray-400'
                          )} />
                          <div className="text-left">
                            <div className={clsx(
                              'text-sm font-medium',
                              isSelected ? 'text-blue-700' : 'text-gray-700'
                            )}>
                              {rate.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {rate.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={clsx(
                            'text-sm font-semibold',
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          )}>
                            {rate.billing === 'per_kg' 
                              ? `${rate.rate.toLocaleString('fr-FR')} FCFA/kg`
                              : `${rate.rate.toLocaleString('fr-FR')} FCFA/m³`
                            }
                          </div>
                          {rate.minimumCharge && (
                            <div className="text-[10px] text-gray-400">
                              min. {rate.minimumCharge.toLocaleString('fr-FR')} FCFA
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}

                  {/* Note explicative */}
                  <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 rounded-lg">
                    <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Le coût exact du transport est calculé au récapitulatif selon le poids/volume total de votre commande.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4. QUANTITÉ SIMPLE (si pas de variantes)
          ═══════════════════════════════════════════════════════════════════════ */}
      {(!product.variantGroups || product.variantGroups.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <label htmlFor="qty-input" className="text-sm font-medium text-gray-700">
              Quantité
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                className="px-3 py-2 hover:bg-gray-100 text-gray-600 text-lg font-medium transition-colors"
              >
                −
              </button>
              <input
                id="qty-input"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value))}
                className="w-14 text-center border-x border-gray-300 py-2 text-sm font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                className="px-3 py-2 hover:bg-gray-100 text-gray-600 text-lg font-medium transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4.5 SIMULATEUR 1688 (IMPORT AVANCÉ)
          ═══════════════════════════════════════════════════════════════════════ */}
      {product.pricing1688 && (
        <ProductPricing1688
          productId={product.id}
          pricing1688={product.pricing1688}
          weightKg={unitWeightKg}
          volumeM3={unitVolumeM3}
          baseCost={product.pricing.baseCost}
          orderQuantity={currentTotalQty}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          5. SOUS-TOTAL DYNAMIQUE (CALCUL COMPLET)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Scale className="h-4 w-4 text-gray-500" />
          Récapitulatif estimé
        </h3>

        <div className="space-y-2 text-sm">
          {/* Sous-total produits */}
          <div className="flex justify-between text-gray-600">
            <span>
              Produits ({variantCalculations.totalQuantity} article{variantCalculations.totalQuantity > 1 ? 's' : ''})
            </span>
            <span className="font-medium">
              {formatCurrency(variantCalculations.subtotalProducts, product.pricing.currency)}
            </span>
          </div>

          {/* Détail variantes sélectionnées (libellés combinés, prix unique) */}
          {variantCalculations.hasVariantSelection && variantCalculations.selectedVariantsList.length > 0 && (
            <div className="pl-3 border-l-2 border-gray-200 text-xs text-gray-500">
              <span className="truncate">
                {variantCalculations.selectedVariantsList.map(v => v.variant.name).join(' · ')}
                {' '}× {variantCalculations.totalQuantity}
                {' '}@ {formatCurrency(variantCalculations.unitPrice, 'FCFA')}
              </span>
            </div>
          )}

          {/* Transport estimé */}
          {shippingEstimate && (
            <>
              <div className="flex justify-between text-gray-600 pt-2 border-t border-dashed border-gray-200">
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Transport ({shippingEstimate.method})
                </span>
                <span className="font-medium text-blue-600">
                  +{formatCurrency(shippingEstimate.cost, 'FCFA')}
                </span>
              </div>
              <div className="text-xs text-gray-400 pl-4">
                {shippingEstimate.label}
              </div>
            </>
          )}

          {/* Poids/Volume total */}
          {(unitWeightKg || unitVolumeM3) && variantCalculations.totalQuantity > 0 && (
            <div className="flex justify-between text-xs text-gray-400 pt-1">
              <span>Poids/volume total estimé</span>
              <span>
                {unitWeightKg && `${(unitWeightKg * variantCalculations.totalQuantity).toFixed(2)} kg`}
                {unitWeightKg && unitVolumeM3 && ' / '}
                {unitVolumeM3 && `${(unitVolumeM3 * variantCalculations.totalQuantity).toFixed(3)} m³`}
              </span>
            </div>
          )}

          {/* Total général */}
          <div className="flex justify-between font-bold text-lg pt-3 mt-2 border-t-2 border-gray-300">
            <span className="text-gray-800">Total estimé</span>
            <span className="text-green-600">
              {formatCurrency(grandTotal, product.pricing.currency)}
            </span>
          </div>
        </div>

        {/* Avertissement si transport non sélectionné */}
        {!selectedShippingId && product.pricing.shippingOptions.length > 0 && (
          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-700 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Sélectionnez un mode de transport pour voir le coût total.</span>
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          6. ACTIONS
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        {/* Action principale */}
        {!showQuote && (
          <button
            type="button"
            onClick={() => addToCart(true)}
            disabled={adding || variantCalculations.totalQuantity === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 text-white px-6 py-4 text-base font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-5 w-5" />
            {adding ? 'Ajout en cours...' : 'Acheter maintenant'}
          </button>
        )}

        {/* Actions secondaires */}
        <div className="flex gap-2">
          {!showQuote && (
            <button
              type="button"
              onClick={() => addToCart(false)}
              disabled={adding || variantCalculations.totalQuantity === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-green-500 text-green-600 px-4 py-3 text-sm font-semibold hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Ajouter au panier</span>
            </button>
          )}

          {/* Favoris */}
          <button
            type="button"
            onClick={toggleFavorite}
            className={clsx(
              'flex items-center justify-center rounded-xl border-2 px-4 py-3 transition-all',
              isFavorite
                ? 'border-red-300 bg-red-50 text-red-500'
                : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500'
            )}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={clsx('h-5 w-5', isFavorite && 'fill-current')} />
          </button>
        </div>

        {/* Demander un devis / Négocier */}
        <div className="flex gap-2">
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('quote_request', { productId: product.id, quantity: variantCalculations.totalQuantity })}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white px-4 py-3 text-sm font-medium hover:bg-green-600 transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            Demander un devis
          </a>

          <button
            type="button"
            onClick={onOpenNegotiation}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 text-gray-600 px-4 py-3 text-sm font-medium hover:border-violet-400 hover:text-violet-600 transition-all"
            title="Négocier le prix"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Négocier</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          6. SERVICES OPTIONNELS (Installation)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={wantsInstallation}
            onChange={(e) => setWantsInstallation(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
          />
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">
                Installation professionnelle
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Faites installer votre produit par nos techniciens certifiés à Dakar.
              Devis sur demande après achat.
            </p>
          </div>
        </label>

        {wantsInstallation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-3 pt-3 border-t border-purple-200"
          >
            <p className="text-xs text-purple-700">
              ✓ Un conseiller vous contactera après votre commande pour planifier l'installation.
            </p>
          </motion.div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          7. ACHAT GROUPÉ (si activé)
          ═══════════════════════════════════════════════════════════════════════ */}
      {product.groupBuyEnabled && (
        <>
          {/* Carte d'appel à l'action */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-5 text-white shadow-xl"
          >
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Achat Groupé</h3>
                  <p className="text-white/80 text-sm">{groupBuyHeadline}</p>
                </div>
              </div>

              {bestGroupBuyUnitPrice !== null && (
                <div className="mb-4">
                  <div className="text-xs text-white/75">Meilleur prix estimé</div>
                  <div className="text-lg font-extrabold">{formatCurrency(bestGroupBuyUnitPrice, 'FCFA')}</div>
                </div>
              )}

              {primaryGroup && (
                <div className="mb-4 bg-white/10 backdrop-blur rounded-xl p-3 border border-white/15">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-white/75">Groupe actif</div>
                      <div className="text-sm font-bold">{primaryGroup.currentQty}/{primaryGroup.targetQty} unités</div>
                      <div className="text-xs text-white/75 mt-0.5">{daysLeft(primaryGroup.deadline)}j restants</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/75">Prix actuel</div>
                      <div className="text-sm font-extrabold">{formatCurrency(primaryGroup.currentUnitPrice, 'FCFA')}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400"
                      style={{
                        width: `${primaryGroup.targetQty > 0 ? Math.min(100, Math.round((primaryGroup.currentQty / primaryGroup.targetQty) * 100)) : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}
              
              {product.priceTiers && product.priceTiers.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {product.priceTiers.slice(0, 3).map((tier, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
                      <div className="text-xs text-white/70">{tier.minQty}+ u</div>
                      <div className="font-bold text-sm">{formatCurrency(tier.price, 'FCFA')}</div>
                    </div>
                  ))}
                </div>
              )}

              {primaryGroup ? (
                <Link
                  href={`/achats-groupes/${primaryGroup.groupId}`}
                  className="w-full flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-white/90 transition-all shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Rejoindre ce groupe
                </Link>
              ) : (
                <button
                  onClick={() => setShowGroupBuyModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-white/90 transition-all shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Démarrer / rejoindre
                </button>
              )}
            </div>
          </motion.div>

          {/* Aperçu des groupes en cours */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-gray-900">Groupes en cours</h4>
              </div>
              <Link
                href={`/achats-groupes?productId=${encodeURIComponent(product.id)}`}
                className="text-xs font-semibold text-indigo-700 hover:underline"
              >
                Voir tout
              </Link>
            </div>
            {groupOrdersLoading ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </div>
            ) : groupOrders.length === 0 ? (
              <div className="text-sm text-gray-600">
                Aucun groupe actif pour ce produit. Vous pouvez en créer un.
              </div>
            ) : (
              <div className="space-y-3">
                {groupOrders.map((g) => {
                  const progress = g.targetQty > 0 ? Math.min(100, Math.round((g.currentQty / g.targetQty) * 100)) : 0
                  const d = daysLeft(g.deadline)
                  return (
                    <div key={g.groupId} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">{g.groupId}</div>
                          <div className="font-bold text-gray-900">{formatCurrency(g.currentUnitPrice, 'FCFA')} / unité</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {g.currentQty}/{g.targetQty} unités • {d}j restants
                          </div>
                        </div>
                        <Link
                          href={`/achats-groupes/${g.groupId}`}
                          className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Rejoindre
                        </Link>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-3">
              <Link
                href={`/achats-groupes?productId=${encodeURIComponent(product.id)}&create=1&qty=${groupBuyQty}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-800"
              >
                <Plus className="w-4 h-4" />
                Créer un achat groupé
              </Link>
            </div>
          </div>

          {/* Modal Achat Groupé */}
          <AnimatePresence>
            {showGroupBuyModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowGroupBuyModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                >
                  {/* Header avec gradient */}
                  <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6 text-white sticky top-0">
                    <button
                      onClick={() => setShowGroupBuyModal(false)}
                      className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Achat Groupé</h2>
                        <p className="text-white/80">Plus on est nombreux, moins on paie !</p>
                      </div>
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="p-6 space-y-6">
                    {/* Produit */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      {product.image && (
                        <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-white flex-shrink-0">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">Prix de base: {formatCurrency(baseUnitPrice, 'FCFA')}</p>
                      </div>
                    </div>

                    {/* Paliers de prix */}
                    {product.priceTiers && product.priceTiers.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <TrendingDown className="w-5 h-5 text-green-600" />
                          Prix dégressifs
                        </h4>
                        <div className="space-y-2">
                          {product.priceTiers.map((tier, i) => {
                            const savings = baseUnitPrice - tier.price
                            const savingsPercent = Math.round((savings / baseUnitPrice) * 100)
                            return (
                              <div 
                                key={i} 
                                className={clsx(
                                  'flex items-center justify-between p-3 rounded-xl border-2 transition-all',
                                  groupBuyQty >= tier.minQty 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-gray-200 bg-white'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={clsx(
                                    'w-8 h-8 rounded-full flex items-center justify-center',
                                    groupBuyQty >= tier.minQty ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                  )}>
                                    {groupBuyQty >= tier.minQty ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{tier.minQty}+ unités</div>
                                    <div className="text-xs text-gray-500">
                                      {savingsPercent > 0 && <span className="text-green-600 font-medium">-{savingsPercent}% </span>}
                                      par rapport au prix de base
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg text-green-600">{formatCurrency(tier.price, 'FCFA')}</div>
                                  {savings > 0 && (
                                    <div className="text-xs text-gray-400">-{formatCurrency(savings, 'FCFA')}/u</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sélecteur de quantité */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Quantité souhaitée</h4>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setGroupBuyQty(Math.max(1, groupBuyQty - 1))}
                          className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={groupBuyQty}
                          onChange={(e) => setGroupBuyQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          onClick={() => setGroupBuyQty(groupBuyQty + 1)}
                          className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Résumé */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Prix estimé ({groupBuyQty} unités)</span>
                        <span className="text-2xl font-bold text-indigo-700">
                          {formatCurrency(
                            (product.priceTiers?.slice().reverse().find(t => groupBuyQty >= t.minQty)?.price || baseUnitPrice) * groupBuyQty,
                            'FCFA'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 pt-0 space-y-3">
                    <Link
                      href={`/achats-groupes?productId=${encodeURIComponent(product.id)}&qty=${groupBuyQty}`}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                    >
                      <Users className="w-5 h-5" />
                      Voir les achats groupés
                    </Link>
                    <Link
                      href={`/achats-groupes?productId=${encodeURIComponent(product.id)}&create=1&qty=${groupBuyQty}`}
                      className="w-full flex items-center justify-center gap-2 bg-white border-2 border-indigo-200 text-indigo-700 font-bold py-4 rounded-xl hover:bg-indigo-50 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      Créer un achat groupé
                    </Link>
                    <button
                      onClick={() => setShowGroupBuyModal(false)}
                      className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition"
                    >
                      Continuer seul
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CONSEIL ACHAT EN GROS
          ═══════════════════════════════════════════════════════════════════════ */}
      {product.isImported && !showQuote && (
        <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-700">Conseil :</span>
            <span className="text-amber-600"> Commandez en gros pour réduire les frais de transport ! Plus de quantité = meilleur prix unitaire.</span>
          </div>
        </div>
      )}
    </div>
  )
}
