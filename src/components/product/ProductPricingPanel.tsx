'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  ShoppingCart,
  Clock,
  MessageCircle,
  Heart,
  Share2,
  FileDown,
  ShieldCheck,
  Wrench,
  CheckCircle,
  Sparkles,
  Truck,
  Info,
  TrendingDown,
  Users,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'

const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

interface PriceTier {
  minQty: number
  maxQty?: number
  price: number
  discount?: number
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

interface ShippingOption {
  id: string
  label: string
  durationDays: number
  cost: number
  currency: string
}

export interface ProductPricingPanelProps {
  productId: string
  productName: string
  productImage?: string | null
  currency: string
  pricing: {
    baseCost: number | null
    salePrice: number | null
    fees?: {
      serviceFeeRate: number
      serviceFeeAmount: number
      insuranceRate: number
      insuranceAmount: number
    }
    totalWithFees?: number | null
    shippingOptions: ShippingOption[]
  }
  availability: {
    status: string
    label: string
    stockQuantity: number
  }
  isImported?: boolean
  requiresQuote: boolean
  variantGroups?: ProductVariantGroup[]
  colorOptions: string[]
  variantOptions: string[]
  priceTiers?: PriceTier[]
  groupBuyEnabled?: boolean
  onAddToCart: (redirect: boolean) => void
  onToggleFavorite: () => void
  onShare: (platform?: string) => void
  onExportPDF: () => void
  onNegotiate: () => void
  onProposeGroupBuy?: () => void
  isFavorite: boolean
  adding: boolean
  wantsInstallation: boolean
  onWantsInstallationChange: (value: boolean) => void
  selectedShippingId: string | null
  onShippingChange: (id: string) => void
  quantity: number
  onQuantityChange: (value: number) => void
  selectedVariants: Record<string, string>
  onVariantSelect: (groupName: string, variantId: string) => void
  variantQuantities: Record<string, number>
  onVariantQuantityChange: (variantId: string, delta: number) => void
}

export default function ProductPricingPanel({
  productId,
  productName,
  productImage,
  currency,
  pricing,
  availability,
  isImported,
  requiresQuote,
  variantGroups,
  colorOptions,
  variantOptions,
  priceTiers,
  groupBuyEnabled,
  onAddToCart,
  onToggleFavorite,
  onShare,
  onExportPDF,
  onNegotiate,
  onProposeGroupBuy,
  isFavorite,
  adding,
  wantsInstallation,
  onWantsInstallationChange,
  selectedShippingId,
  onShippingChange,
  quantity,
  onQuantityChange,
  selectedVariants,
  onVariantSelect,
  variantQuantities,
  onVariantQuantityChange
}: ProductPricingPanelProps) {
  const [showPriceDetails, setShowPriceDetails] = useState(false)
  const [showTransportRates, setShowTransportRates] = useState(false)
  
  const shippingEnabled = pricing.shippingOptions.length > 0 && availability.status !== 'in_stock'
  const activeShipping = shippingEnabled && selectedShippingId
    ? pricing.shippingOptions.find((option) => option.id === selectedShippingId) || null
    : null
  
  // Calcul du prix effectif
  const effectivePrice = pricing.totalWithFees ?? pricing.salePrice
  const unitPrice = !requiresQuote ? effectivePrice : null
  const showQuote = requiresQuote || unitPrice === null
  const deliveryDays = activeShipping?.durationDays ?? null
  
  // Total variant quantities
  const totalVariantQuantity = useMemo(() => {
    return Object.values(variantQuantities || {}).reduce((sum, q) => sum + q, 0)
  }, [variantQuantities])
  
  const variantSubtotal = useMemo(() => {
    const entries = Object.entries(variantQuantities || {}).filter(([, q]) => q > 0)
    if (entries.length === 0) return 0
    let sum = 0
    for (const [variantId, qty] of entries) {
      const variant = variantGroups?.flatMap(g => g.variants).find(v => v.id === variantId)
      const price = (variant && typeof variant.priceFCFA === 'number' && variant.priceFCFA > 0)
        ? variant.priceFCFA
        : (effectivePrice ?? 0)
      sum += price * qty
    }
    return sum
  }, [variantQuantities, variantGroups, effectivePrice])
  
  const hasVariantSelection = totalVariantQuantity > 0
  const displayedQuantity = hasVariantSelection ? totalVariantQuantity : quantity
  const displayedSubtotal = hasVariantSelection ? variantSubtotal : (unitPrice ? unitPrice * Math.max(1, quantity) : 0)
  const totalPrice = hasVariantSelection ? variantSubtotal : (unitPrice ? unitPrice * Math.max(1, quantity) : null)
  
  const unitPriceLabel = unitPrice ? formatCurrency(unitPrice, currency) : null
  const totalPriceLabel = totalPrice ? formatCurrency(totalPrice, currency) : null
  
  const whatsappUrl = () => {
    const channel = shippingEnabled
      ? activeShipping?.label || 'À définir'
      : 'Retrait / livraison locale Dakar'
    const message = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${productName}.
Mode de transport souhaité: ${channel}.
Quantité: ${quantity}.
Merci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${message}`
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header avec badges */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            IT Vision
          </span>
          {isImported && (
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Import Chine
            </span>
          )}
        </div>
        {availability.status === 'in_stock' && (
          <span className="bg-white text-emerald-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Package className="w-3 h-3" />
            Stock Dakar
          </span>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BLOC PRIX PRINCIPAL                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-xl p-4 border border-emerald-100">
          {/* Prix attractif (baseCost) */}
          {pricing.baseCost !== null && (
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-3">
              <span className="text-sm text-emerald-700 font-medium flex items-center gap-1">
                💰 Prix source
              </span>
              <span className="text-2xl font-black text-emerald-600">
                {formatCurrency(pricing.baseCost, currency)}
              </span>
            </div>
          )}
          
          {/* Détails frais (collapsible) */}
          {pricing.fees && (
            <>
              <button
                onClick={() => setShowPriceDetails(!showPriceDetails)}
                className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Détails frais service & assurance
                </span>
                {showPriceDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showPriceDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Frais de service ({pricing.fees.serviceFeeRate}%)</span>
                        <span>+{formatCurrency(pricing.fees.serviceFeeAmount, currency)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Assurance ({pricing.fees.insuranceRate}%)</span>
                        <span>+{formatCurrency(pricing.fees.insuranceAmount, currency)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          
          {/* Prix unitaire TTC */}
          <div className="mt-3 pt-3 border-t border-emerald-200">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-gray-700">Prix unitaire TTC</span>
              <span className="text-3xl font-black text-emerald-600">
                {unitPriceLabel || 'Sur devis'}
              </span>
            </div>
            {deliveryDays && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <Clock className="w-3 h-3" />
                Livraison ~{deliveryDays}j
              </div>
            )}
          </div>
        </div>
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* OPTIONS DE TRANSPORT                                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {shippingEnabled && pricing.shippingOptions.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Mode de transport</div>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {pricing.shippingOptions.map((option) => {
                const active = option.id === selectedShippingId
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onShippingChange(option.id)}
                    className={clsx(
                      'flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all text-center',
                      active
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-600 hover:bg-white/50'
                    )}
                  >
                    <div>{option.label}</div>
                    <div className="text-[10px] text-gray-400">{option.durationDays}j</div>
                  </button>
                )
              })}
            </div>
            
            {/* Tarifs transport (collapsible) */}
            <button
              onClick={() => setShowTransportRates(!showTransportRates)}
              className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Exemples de tarifs transport
              {showTransportRates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            <AnimatePresence>
              {showTransportRates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2 text-xs bg-gray-50 rounded-lg p-3">
                    {Object.values(BASE_SHIPPING_RATES).map((rate) => (
                      <div key={rate.id} className="flex justify-between">
                        <span className="text-gray-600">{rate.label}</span>
                        <span className="font-medium">
                          {rate.billing === 'per_kg' ? `${rate.rate.toLocaleString('fr-FR')} ${currency}/kg` : `${rate.rate.toLocaleString('fr-FR')} ${currency}/m³`}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONSEIL ACHAT EN GROS                                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isImported && !showQuote && (
          <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="text-amber-700">
              <strong>Conseil :</strong> Commandez en gros pour réduire les frais de transport ! Plus de quantité = meilleur prix.
            </span>
          </div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DIMENSIONS / SELECTEUR                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {variantGroups && variantGroups.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-600">Dimension</div>
            {variantGroups.map((group) => (
              <div key={group.name} className="flex flex-wrap gap-2">
                {group.variants.map((variant) => {
                  const isSelected = selectedVariants[group.name] === variant.id
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => onVariantSelect(group.name, variant.id)}
                      className={clsx(
                        'px-3 py-2 text-sm rounded-lg border-2 transition-all flex items-center gap-2',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300',
                        variant.stock === 0 && 'opacity-40 cursor-not-allowed'
                      )}
                      disabled={variant.stock === 0}
                    >
                      {variant.name}
                      {variant.stock !== undefined && variant.stock > 0 && (
                        <span className="text-[10px] text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded">
                          {variant.stock} en stock
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        
        {/* Options legacy (couleur/variante simple) */}
        {colorOptions.filter(Boolean).length > 0 && (!variantGroups || variantGroups.length === 0) && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-600">Couleur</div>
            <div className="flex flex-wrap gap-2">
              {colorOptions.filter(Boolean).map((color) => (
                <button
                  key={color}
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:border-emerald-300 transition-all"
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* QUANTITÉ                                                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!hasVariantSelection && (
          <div className="flex items-center gap-3">
            <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => onQuantityChange(quantity - 1)}
                className="px-4 py-2 hover:bg-gray-100 text-gray-600 text-lg font-medium"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => onQuantityChange(Number(e.target.value))}
                className="w-16 text-center border-x border-gray-200 py-2 text-lg font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onQuantityChange(quantity + 1)}
                className="px-4 py-2 hover:bg-gray-100 text-gray-600 text-lg font-medium"
              >
                +
              </button>
            </div>
            <span className="text-sm text-gray-500">unité(s)</span>
          </div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SOUS-TOTAL                                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">Sous-total produit</span>
          <span className="text-2xl font-black text-emerald-600">
            {formatCurrency(displayedSubtotal, currency)}
          </span>
        </div>
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BOUTONS ACTION                                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          {!showQuote && (
            <>
              <button
                type="button"
                onClick={() => onAddToCart(true)}
                disabled={adding}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3.5 text-base font-bold transition-all shadow-lg disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5" />
                {adding ? 'Ajout en cours...' : 'Acheter maintenant'}
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onAddToCart(false)}
                  disabled={adding}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 text-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 transition-all disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Panier
                </button>
                
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-green-600 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                  </svg>
                  Devis
                </a>
              </div>
            </>
          )}
          
          {showQuote && (
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white px-4 py-3.5 text-base font-bold hover:bg-green-600 transition-all shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
              </svg>
              Demander un devis WhatsApp
            </a>
          )}
          
          {/* Négocier */}
          <button
            type="button"
            onClick={onNegotiate}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 px-4 py-2.5 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Négocier le prix
          </button>
        </div>
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* INSTALLATION PROFESSIONNELLE                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="border-2 border-orange-200 rounded-xl overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50">
          <button
            type="button"
            onClick={() => onWantsInstallationChange(!wantsInstallation)}
            className="w-full flex items-center justify-between p-3 hover:bg-orange-100/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                wantsInstallation ? 'bg-orange-500 text-white' : 'bg-white border-2 border-orange-300 text-orange-500'
              )}>
                <Wrench className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-800 text-sm">Installation professionnelle</h3>
                <p className="text-[10px] text-gray-500">Techniciens certifiés • Sur devis</p>
              </div>
            </div>
            <div className={clsx(
              'w-12 h-7 rounded-full transition-colors relative flex-shrink-0',
              wantsInstallation ? 'bg-orange-500' : 'bg-gray-300'
            )}>
              <div className={clsx(
                'absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform',
                wantsInstallation ? 'translate-x-6' : 'translate-x-1'
              )} />
            </div>
          </button>
        </div>
        
        {/* Actions secondaires */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button 
              onClick={onExportPDF} 
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <FileDown className="w-3 h-3" /> PDF
            </button>
            <button 
              onClick={() => onShare('copy')} 
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Share2 className="w-3 h-3" /> Partager
            </button>
          </div>
          
          <button
            type="button"
            onClick={onToggleFavorite}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all',
              isFavorite 
                ? 'border-red-300 bg-red-50 text-red-500' 
                : 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
            )}
          >
            <Heart className={clsx('w-4 h-4', isFavorite && 'fill-current')} />
            <span className="text-xs">{isFavorite ? 'Favori' : 'Favoris'}</span>
          </button>
        </div>
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PALIERS DE PRIX (si pas d'achat groupé)                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {priceTiers && priceTiers.length > 0 && !groupBuyEnabled && (
          <div className="mt-4 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-5 h-5 text-teal-600" />
              <span className="font-bold text-teal-800">Prix dégressifs</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {priceTiers.slice(0, 3).map((tier, i) => (
                <div 
                  key={i} 
                  className={clsx(
                    'p-2 rounded-lg border',
                    i === priceTiers!.length - 1 ? 'bg-teal-100 border-teal-300' : 'bg-white border-gray-200'
                  )}
                >
                  <div className="font-bold text-gray-800">{tier.minQty}+</div>
                  <div className="text-sm font-semibold text-teal-600">{formatCurrency(tier.price, currency)}</div>
                  {tier.discount && <div className="text-[10px] text-teal-500">-{tier.discount}%</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ACHAT GROUPÉ CTA (si activé)                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {groupBuyEnabled && onProposeGroupBuy && (
          <button
            onClick={onProposeGroupBuy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-3 text-sm font-bold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md"
          >
            <Users className="w-5 h-5" />
            Économisez plus en achat groupé
          </button>
        )}
        
        {/* Badges confiance */}
        <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            Livraison Dakar
          </div>
        </div>
      </div>
    </div>
  )
}
