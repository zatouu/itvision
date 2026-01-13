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
  X,
} from 'lucide-react'
import type { ProductDetailData, ProductVariant, ProductVariantGroup } from './ProductDetailExperience'
import type { ShippingOptionPricing } from '@/lib/logistics'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import { trackEvent } from '@/utils/analytics'

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
  // ─── State ─────────────────────────────────────────────────────────────────
  const [quantity, setQuantity] = useState(1)
  // Quantités par variante (style 1688 - chaque variante a sa propre quantité)
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({})
  const [adding, setAdding] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showPriceDetails, setShowPriceDetails] = useState(false)
  const [showTransportModal, setShowTransportModal] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [wantsInstallation, setWantsInstallation] = useState(false)
  // Image zoomée (pour preview au survol et clic)
  const [hoveredVariantImage, setHoveredVariantImage] = useState<string | null>(null)
  const [imageZoomPosition, setImageZoomPosition] = useState<{ x: number; y: number } | null>(null)

  // ─── Computed Values ───────────────────────────────────────────────────────

  // Poids unitaire du produit
  const unitWeightKg = useMemo(() => {
    return product.weights?.netWeightKg ?? product.logistics.weightKg ?? null
  }, [product.weights, product.logistics.weightKg])

  // Volume unitaire du produit
  const unitVolumeM3 = useMemo(() => {
    return product.logistics.volumeM3 ?? null
  }, [product.logistics.volumeM3])

  // Calcul du prix de base (hors variantes)
  const baseUnitPrice = useMemo(() => {
    return product.pricing.totalWithFees ?? product.pricing.salePrice ?? 0
  }, [product.pricing.totalWithFees, product.pricing.salePrice])

  // Calcul du total par variantes (quantités × prix)
  const variantCalculations = useMemo(() => {
    const entries = Object.entries(variantQuantities).filter(([, qty]) => qty > 0)
    
    if (entries.length === 0) {
      // Pas de variantes sélectionnées : utiliser la quantité simple
      return {
        totalQuantity: quantity,
        subtotalProducts: baseUnitPrice * quantity,
        hasVariantSelection: false,
        selectedVariantsList: [] as Array<{ variant: ProductVariant; qty: number; price: number }>
      }
    }

    let totalQuantity = 0
    let subtotalProducts = 0
    const selectedVariantsList: Array<{ variant: ProductVariant; qty: number; price: number }> = []

    for (const [variantId, qty] of entries) {
      const variant = product.variantGroups?.flatMap(g => g.variants).find(v => v.id === variantId)
      if (!variant) continue
      const price = (variant.priceFCFA && variant.priceFCFA > 0) ? variant.priceFCFA : baseUnitPrice
      subtotalProducts += price * qty
      totalQuantity += qty
      selectedVariantsList.push({ variant, qty, price })
    }

    return {
      totalQuantity,
      subtotalProducts,
      hasVariantSelection: true,
      selectedVariantsList
    }
  }, [variantQuantities, quantity, baseUnitPrice, product.variantGroups])

  // Calcul du transport estimé
  const shippingEstimate = useMemo(() => {
    if (!selectedShippingId) return null
    
    const rate = BASE_SHIPPING_RATES[selectedShippingId as keyof typeof BASE_SHIPPING_RATES]
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
  }, [selectedShippingId, variantCalculations.totalQuantity, unitWeightKg, unitVolumeM3])

  // Total général (produits + transport)
  const grandTotal = useMemo(() => {
    const productTotal = variantCalculations.subtotalProducts
    const shippingCost = shippingEstimate?.cost ?? 0
    return productTotal + shippingCost
  }, [variantCalculations.subtotalProducts, shippingEstimate])

  // Shipping option sélectionnée
  const activeShipping = useMemo(() => {
    if (!selectedShippingId) return null
    const rate = BASE_SHIPPING_RATES[selectedShippingId as keyof typeof BASE_SHIPPING_RATES]
    return rate ?? null
  }, [selectedShippingId])

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

  const handleVariantQuantityChange = useCallback((variantId: string, delta: number) => {
    setVariantQuantities(prev => {
      const current = prev[variantId] || 0
      const newQty = Math.max(0, current + delta)
      return { ...prev, [variantId]: newQty }
    })
  }, [])

  const setVariantQuantityDirect = useCallback((variantId: string, value: number) => {
    setVariantQuantities(prev => ({
      ...prev,
      [variantId]: Math.max(0, Math.round(value))
    }))
  }, [])

  const handleVariantSelect = useCallback((groupName: string, variant: ProductVariant) => {
    onVariantChange(groupName, variant.id)
    // Si la variante a une image, notifier le parent
    if (variant.image && onImageChange) {
      onImageChange(variant.image)
    }
  }, [onVariantChange, onImageChange])

  // Gérer le survol d'image avec position de souris
  const handleImageHover = useCallback((e: React.MouseEvent, imageUrl: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setImageZoomPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top + rect.height / 2 
    })
    setHoveredVariantImage(imageUrl)
  }, [])

  const handleImageLeave = useCallback(() => {
    setHoveredVariantImage(null)
    setImageZoomPosition(null)
  }, [])

  const addToCart = useCallback((redirect = false) => {
    try {
      setAdding(true)
      if (typeof window === 'undefined') return

      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const currency = product.pricing.currency

      // Si des variantes sont sélectionnées avec quantités
      if (variantCalculations.hasVariantSelection) {
        for (const { variant, qty, price } of variantCalculations.selectedVariantsList) {
          const id = `${product.id}-${variant.id}${shippingKey}`
          const existsIndex = items.findIndex((item: any) => item.id === id)

          if (existsIndex >= 0) {
            items[existsIndex].qty += qty
            items[existsIndex].price = price
            items[existsIndex].currency = currency
          } else {
            const newItem: any = {
              id,
              name: `${product.name} — ${variant.name}`,
              qty,
              price,
              currency,
              requiresQuote: !!product.requiresQuote,
              variantId: variant.id,
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
      trackEvent('add_to_cart', { productId: product.id, quantity: variantCalculations.totalQuantity })
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
      ? `\nVariantes: ${variantCalculations.selectedVariantsList.map(v => `${v.variant.name} (x${v.qty})`).join(', ')}`
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
      <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
        {/* Badge transparence */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
            <Shield className="h-3 w-3" />
            Prix sans frais cachés
          </span>
        </div>

        {/* Prix principal */}
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-4xl font-extrabold text-emerald-600">
            {baseUnitPrice > 0 ? formatCurrency(baseUnitPrice, product.pricing.currency) : 'Sur devis'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Prix unitaire estimé – hors transport</p>

        {/* ══ DÉTAIL DES FRAIS - TOUJOURS VISIBLE ══ */}
        {product.pricing.fees && (
          <div className="border-t border-emerald-100 pt-3 space-y-2">
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
              <span className="text-emerald-600">{formatCurrency(baseUnitPrice, product.pricing.currency)}</span>
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
          className="mt-3 text-xs text-gray-500 hover:text-emerald-600 font-medium flex items-center gap-1"
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
          2. SÉLECTEUR DE VARIANTES (STYLE 1688 - LISTE AVEC QUANTITÉS)
          ═══════════════════════════════════════════════════════════════════════ */}
      {product.variantGroups && product.variantGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            Sélectionner les variantes
          </h3>
          
          {product.variantGroups.map((group) => (
            <div key={group.name} className="mb-4 last:mb-0">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                {group.name}
              </div>
              
              {/* Liste des variantes (style 1688 amélioré) */}
              <div className="grid gap-3 max-h-96 overflow-y-auto pr-1">
                {group.variants.map((variant) => {
                  const isOutOfStock = variant.stock === 0
                  const qty = variantQuantities[variant.id] || 0
                  const hasQuantity = qty > 0
                  const price = (variant.priceFCFA && variant.priceFCFA > 0) ? variant.priceFCFA : baseUnitPrice
                  const priceDisplay = formatCurrency(price, 'FCFA')
                  const isSelected = selectedVariants[group.name] === variant.id

                  return (
                    <div
                      key={variant.id}
                      className={clsx(
                        'relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md',
                        hasQuantity
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                        isOutOfStock && 'opacity-60'
                      )}
                    >
                      {/* Image variante plus grande avec effets */}
                      {variant.image ? (
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={(e) => {
                              handleImageHover(e, variant.image!)
                            }}
                            onMouseEnter={(e) => handleImageHover(e, variant.image!)}
                            onMouseLeave={handleImageLeave}
                            className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 cursor-zoom-in group border-2 border-transparent group-hover:border-blue-300 transition-all duration-200"
                          >
                            <Image
                              src={variant.image}
                              alt={variant.name}
                              fill
                              className="object-cover transition-all duration-300 group-hover:scale-110"
                              sizes="80px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                whileHover={{ scale: 1, opacity: 1 }}
                                className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg"
                              >
                                <ZoomIn className="w-4 h-4 text-gray-700" />
                              </motion.div>
                            </div>
                          </button>
                          {/* Badge de sélection si c'est la variante active */}
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Infos variante améliorées */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className={clsx(
                            'text-sm font-semibold truncate',
                            hasQuantity ? 'text-emerald-700' : isSelected ? 'text-blue-700' : 'text-gray-800'
                          )}>
                            {variant.name}
                          </h4>
                          {/* Bouton de sélection rapide */}
                          <button
                            type="button"
                            onClick={() => handleVariantSelect(group.name, variant)}
                            className={clsx(
                              'text-xs px-2 py-1 rounded-md font-medium transition-colors',
                              isSelected
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                            )}
                          >
                            {isSelected ? 'Sélectionné' : 'Sélectionner'}
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              'text-base font-bold',
                              hasQuantity ? 'text-emerald-600' : 'text-orange-600'
                            )}>
                              {priceDisplay}
                            </span>
                            {/* Différence de prix si différente du prix de base */}
                            {price !== baseUnitPrice && (
                              <span className={clsx(
                                'text-xs px-2 py-0.5 rounded-full font-medium',
                                price > baseUnitPrice 
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              )}>
                                {price > baseUnitPrice ? '+' : ''}{formatCurrency(price - baseUnitPrice, 'FCFA')}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className={clsx(
                              'text-xs font-medium',
                              variant.stock > 10 ? 'text-green-600' : variant.stock > 0 ? 'text-orange-600' : 'text-red-600'
                            )}>
                              {variant.stock > 0 
                                ? `${variant.stock.toLocaleString('fr-FR')} dispo.` 
                                : 'Rupture'
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contrôle quantité */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVariantQuantityChange(variant.id, -1)}
                          disabled={qty === 0 || isOutOfStock}
                          className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            qty > 0
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-400'
                          )}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <input
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) => setVariantQuantityDirect(variant.id, parseInt(e.target.value) || 0)}
                          disabled={isOutOfStock}
                          className={clsx(
                            'w-12 h-8 text-center text-sm font-semibold border rounded-lg focus:outline-none focus:ring-2',
                            hasQuantity
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 focus:ring-emerald-500'
                              : 'border-gray-300 bg-white text-gray-700 focus:ring-gray-400'
                          )}
                        />
                        
                        <button
                          type="button"
                          onClick={() => handleVariantQuantityChange(variant.id, 1)}
                          disabled={isOutOfStock}
                          className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            !isOutOfStock
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Badge quantité sélectionnée */}
                      {hasQuantity && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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
                  {Object.values(BASE_SHIPPING_RATES).map((rate) => {
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

          {/* Détail variantes sélectionnées */}
          {variantCalculations.hasVariantSelection && variantCalculations.selectedVariantsList.length > 0 && (
            <div className="pl-3 border-l-2 border-gray-200 space-y-1">
              {variantCalculations.selectedVariantsList.map(({ variant, qty, price }) => (
                <div key={variant.id} className="flex justify-between text-xs text-gray-500">
                  <span className="truncate max-w-[180px]">{variant.name} × {qty}</span>
                  <span>{formatCurrency(price * qty, 'FCFA')}</span>
                </div>
              ))}
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
            <span className="text-emerald-600">
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 text-base font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 text-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 text-gray-600 px-4 py-3 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 transition-all"
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
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="font-bold text-purple-800">Achat Groupé Disponible !</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Rejoignez d'autres acheteurs pour obtenir un meilleur prix.
          </p>
          {product.priceTiers && product.priceTiers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {product.priceTiers.slice(0, 3).map((tier, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-white rounded-full border border-purple-200">
                  <TrendingDown className="w-3 h-3 inline mr-1 text-emerald-500" />
                  {tier.minQty}+ = {formatCurrency(tier.price, product.pricing.currency)}
                </span>
              ))}
            </div>
          )}
          <Link
            href={`/achats-groupes?productId=${product.id}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 text-sm font-bold hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            <Users className="w-4 h-4" />
            Voir les achats groupés
          </Link>
        </div>
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
