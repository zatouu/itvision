"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, Plane, Ship, Clock, Heart, Users } from 'lucide-react'
import { trackEvent } from '@/utils/analytics'

interface ShippingOption {
  id: string
  label: string
  description: string
  durationDays: number
  cost: number
  total: number
  currency: string
}

export interface ProductCardProps {
  name: string
  model?: string
  price?: string
  priceAmount?: number
  currency?: string
  requiresQuote?: boolean
  deliveryDays?: number
  features: string[]
  rating: number
  images: string[]
  shippingOptions?: ShippingOption[]
  availabilityStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  detailHref?: string
  isNew?: boolean
  isPopular?: boolean
  createdAt?: string
  onCompareToggle?: (productId: string, isSelected: boolean) => void
  isComparing?: boolean
  isImported?: boolean // Produit importé (sans exposer les détails source)
  // Données physiques pour le calcul transport
  unitWeightKg?: number
  unitVolumeM3?: number
  // Achat groupé
  groupBuyEnabled?: boolean
  groupBuyBestPrice?: number // Meilleur prix possible en achat groupé
  groupBuyDiscount?: number // Pourcentage d'économie max

  groupStats?: {
    activeGroupCount: number
    bestActiveGroup?: {
      groupId: string
      status?: string
      currentQty?: number
      targetQty?: number
      currentPrice?: number
      participantCount?: number
      deadline?: string
    } | null
  }
}

const PATH_SEPARATOR = '/'

const shippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  return Plane
}

export default function ProductCard({
  name,
  model,
  price,
  priceAmount,
  currency = 'FCFA',
  requiresQuote,
  deliveryDays = 0,
  features,
  rating,
  images,
  shippingOptions = [],
  availabilityStatus,
  detailHref,
  isNew = false,
  isPopular = false,
  createdAt,
  onCompareToggle,
  isComparing = false,
  isImported = false,
  unitWeightKg,
  unitVolumeM3,
  groupBuyEnabled = false,
  groupBuyBestPrice,
  groupBuyDiscount,
  groupStats
}: ProductCardProps) {
  const isRecentlyNew = createdAt 
    ? (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false
  const showNewBadge = isNew || isRecentlyNew
  const [activeIndex, setActiveIndex] = useState(0)
  const [adding, setAdding] = useState(false)
  
  // Fonction pour trouver l'option de 15 jours par défaut
  const getDefaultShippingOption = () => {
    if (shippingOptions.length === 0) return null
    // Chercher l'option de 15 jours en priorité
    const option15j = shippingOptions.find(opt => opt.durationDays === 15)
    if (option15j) return option15j.id
    // Sinon, prendre la première option disponible
    return shippingOptions[0]?.id ?? null
  }
  
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(getDefaultShippingOption())
  const [isFavorite, setIsFavorite] = useState(false)
  const shippingEnabled = shippingOptions.length > 0 && availabilityStatus !== 'in_stock'
  
  useEffect(() => {
    if (typeof window === 'undefined' || !detailHref) return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      const productId = detailHref.split(PATH_SEPARATOR).pop()
      setIsFavorite(favorites.some((id: string) => id === productId))
    } catch {
      setIsFavorite(false)
    }
  }, [detailHref])
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window === 'undefined' || !detailHref) return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      const productId = detailHref.split(PATH_SEPARATOR).pop()
      
      if (isFavorite) {
        const updated = favorites.filter((id: string) => id !== productId)
        localStorage.setItem('wishlist:items', JSON.stringify(updated))
        setIsFavorite(false)
        trackEvent('remove_from_wishlist', { productId })
      } else {
        favorites.push(productId)
        localStorage.setItem('wishlist:items', JSON.stringify(favorites))
        setIsFavorite(true)
        trackEvent('add_to_wishlist', { productId })
      }
      
      window.dispatchEvent(new CustomEvent('wishlist:updated'))
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  useEffect(() => {
    if (!shippingEnabled) {
      setSelectedShippingId(null)
      return
    }
    // Si l'option sélectionnée n'existe plus, ou si aucune option n'est sélectionnée
    if (!selectedShippingId || !shippingOptions.find(option => option.id === selectedShippingId)) {
      // Prioriser l'option de 15 jours, sinon prendre la première disponible
      const defaultOption = getDefaultShippingOption()
      setSelectedShippingId(defaultOption)
    }
  }, [shippingOptions, selectedShippingId, shippingEnabled])

  const activeShipping = shippingEnabled && selectedShippingId
    ? shippingOptions.find(option => option.id === selectedShippingId) || null
    : null
  const effectiveCurrency = activeShipping?.currency || currency
  const computedDeliveryDays = activeShipping?.durationDays ?? deliveryDays
  
  // Calcul du prix : si transport activé, utiliser le total du transport, sinon le prix de base
  const basePrice = priceAmount || 0
  // Nouveau comportement : afficher le prix sourcing (basePrice) comme prix principal sur la carte.
  // Ne pas inclure automatiquement le transport dans le prix affiché — cela provoque de la confusion.
  const computedPriceAmount = !requiresQuote ? basePrice : undefined
  const serviceFeeRange = { min: 10, max: 20 } // en pourcentage
  const insurancePercent = 2.5
  const computedPriceLabel = computedPriceAmount && !requiresQuote
    ? `À partir de ${computedPriceAmount.toLocaleString('fr-FR')} ${effectiveCurrency}`
    : price || 'Sur devis'

  const whatsappUrl = () => {
    const channel = shippingEnabled
      ? activeShipping?.label || 'À définir'
      : 'Retrait ' + PATH_SEPARATOR + ' livraison locale Dakar'
    const modelText = model ? ` (${model})` : ''
    const msg = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${name}${modelText}.\nMode de transport souhaité: ${channel}.\nMerci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${msg}`
  }

  const addToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setAdding(true)
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cart:items') : null
      const items = raw ? JSON.parse(raw) : []
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const productName = `${name}-${model || ''}${shippingKey}`
      const whitespaceRegex = new RegExp('\\s+', 'g')
      const id = productName.replace(whitespaceRegex, '-').toLowerCase()
      const existsIndex = items.findIndex((i: any) => i.id === id)
      if (existsIndex >= 0) {
        items[existsIndex].qty += 1
        // Garder le prix principal égal au prix sourcing. Les frais/transport sont stockés séparément.
        items[existsIndex].price = basePrice
        items[existsIndex].currency = effectiveCurrency
        if (typeof unitWeightKg === 'number') {
          items[existsIndex].unitWeightKg = unitWeightKg
        }
        if (typeof unitVolumeM3 === 'number') {
          items[existsIndex].unitVolumeM3 = unitVolumeM3
        }
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
        const itemName = model ? `${name} (${model})` : name
        items.push({
          id,
          name: itemName,
          qty: 1,
          // Prix principal = prix sourcing (basePrice). Les frais et le transport sont ajoutés au checkout.
          price: basePrice,
          currency: effectiveCurrency,
          requiresQuote: !!requiresQuote,
          unitWeightKg: typeof unitWeightKg === 'number' ? unitWeightKg : undefined,
          unitVolumeM3: typeof unitVolumeM3 === 'number' ? unitVolumeM3 : undefined,
          shipping: activeShipping ? {
            id: activeShipping.id,
            label: activeShipping.label,
            durationDays: activeShipping.durationDays,
            cost: activeShipping.cost,
            currency: activeShipping.currency
          } : undefined
        })
        // Ajouter méta frais/assurance pour que le panier/checkout puisse calculer le total final
        const lastIndex = items.length - 1
        items[lastIndex].serviceFeeRange = serviceFeeRange
        items[lastIndex].insurancePercent = insurancePercent
      }
      localStorage.setItem('cart:items', JSON.stringify(items))
      trackEvent('add_to_cart', { productId: id })
      try {
        window.dispatchEvent(new CustomEvent('cart:updated'))
      } catch {}
      alert('Produit ajouté au panier')
    } finally {
      setAdding(false)
    }
  }

  const devisRegex = new RegExp('devis', 'i')
  const showQuote = typeof requiresQuote === 'boolean' ? requiresQuote : (price ? devisRegex.test(price) : !computedPriceAmount)
  const isInStock = availabilityStatus === 'in_stock'
  const primaryCtaLabel = isInStock ? 'Acheter' : 'Commander'

  const bestActiveGroup = groupStats?.bestActiveGroup ?? null
  const activeGroupCount = typeof groupStats?.activeGroupCount === 'number' ? groupStats?.activeGroupCount : 0
  const groupProgressPercent = (() => {
    if (!bestActiveGroup) return null
    const currentQty = typeof bestActiveGroup.currentQty === 'number' ? bestActiveGroup.currentQty : 0
    const targetQty = typeof bestActiveGroup.targetQty === 'number' ? bestActiveGroup.targetQty : 0
    if (targetQty <= 0) return null
    const pct = Math.max(0, Math.min(100, Math.round((currentQty / targetQty) * 100)))
    return pct
  })()

  const joinHref = bestActiveGroup?.groupId ? `/achats-groupes/${bestActiveGroup.groupId}` : null
  const canJoin = !!(joinHref && bestActiveGroup?.status === 'open')
  const isFilledGroup = !!(joinHref && bestActiveGroup?.status === 'filled')
  const currentGroupPriceLabel = typeof bestActiveGroup?.currentPrice === 'number'
    ? `${bestActiveGroup.currentPrice.toLocaleString('fr-FR')} ${effectiveCurrency}`
    : null

  const handleCardClick = () => {
    if (detailHref && typeof window !== 'undefined') {
      window.location.href = detailHref
    }
  }

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-lg hover:border-emerald-300 transition-all duration-200 h-full flex flex-col cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={images[activeIndex] || images[0] || '/file.svg'}
          alt={name}
          fill
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          loading="lazy"
        />
        
        {/* Favoris */}
        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors z-10"
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
        </button>
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col flex-1">
        {/* Rating + Badges (compact, sans cacher l'image) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span>{rating.toFixed(1)}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1">
            {showNewBadge && (
              <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold leading-none">Nouv.</span>
            )}
            {isPopular && !showNewBadge && (
              <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold leading-none">Top</span>
            )}
            {groupBuyEnabled && (
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold leading-none">
                Groupe{groupBuyDiscount ? ` -${Math.round(groupBuyDiscount)}%` : ''}
              </span>
            )}
            {groupBuyEnabled && activeGroupCount > 0 && (
              <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold leading-none tabular-nums">
                {groupProgressPercent !== null ? `${groupProgressPercent}%` : `${activeGroupCount} grp`}
              </span>
            )}
            {isImported && !isInStock && (
              <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold leading-none">Import</span>
            )}
            {isInStock && (
              <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold leading-none">Stock DK</span>
            )}
            {!isInStock && !showNewBadge && !isImported && !isPopular && !groupBuyEnabled && (
              <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold leading-none">Sur cmd</span>
            )}
          </div>
        </div>

        {/* Titre */}
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
          {name}
        </h3>
        {model && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{model}</p>
        )}

        {/* Features clés (limitées à 2 pour la carte) */}
        {features && features.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {features.slice(0, 2).map((feature, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded"
              >
                {feature.length > 30 ? feature.substring(0, 30) + '...' : feature}
              </span>
            ))}
          </div>
        )}

        {/* Prix avec variation selon transport */}
        <div className="mb-3">
          <div className="text-xl font-bold text-emerald-600">
            {computedPriceLabel}
          </div>
          {groupBuyEnabled && (bestActiveGroup || typeof groupBuyBestPrice === 'number') && (
            <div className="mt-1 space-y-1">
              {bestActiveGroup && currentGroupPriceLabel && (
                <div className="text-[11px] leading-tight text-gray-600 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <Users className="h-3 w-3 text-purple-600 flex-shrink-0" />
                    <span className="font-semibold text-purple-700 truncate">Actuel</span>
                  </div>
                  <span className="font-bold text-purple-700 tabular-nums whitespace-nowrap">{currentGroupPriceLabel}</span>
                </div>
              )}
              {typeof groupBuyBestPrice === 'number' && groupBuyBestPrice > 0 && (
                <div className="text-[11px] leading-tight text-gray-600 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-indigo-700 truncate">Possible</span>
                  </div>
                  <span className="font-semibold text-indigo-700 tabular-nums whitespace-nowrap">
                    {groupBuyBestPrice.toLocaleString('fr-FR')} {effectiveCurrency}
                  </span>
                </div>
              )}
            </div>
          )}
          {!showQuote && shippingEnabled && activeShipping && (
            <div className="text-xs text-gray-500 mt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{computedDeliveryDays} jours</span>
              </div>
              {basePrice > 0 && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Prix source • hors frais et transport
                </div>
              )}
            </div>
          )}
          {!showQuote && !shippingEnabled && computedDeliveryDays > 0 && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              <span>{computedDeliveryDays} jours</span>
            </div>
          )}
        </div>

        {/* Shipping details removed from listing card to keep card minimal and encourage clicking 'Voir détails' */}

        {/* Action: Voir détails */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex flex-col gap-2">
            {joinHref && (canJoin || isFilledGroup) && (
              <a
                href={joinHref}
                onClick={(e) => { e.stopPropagation() }}
                className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <span>{canJoin ? 'Rejoindre le groupe' : 'Voir le groupe'}</span>
              </a>
            )}

            <a
              href={detailHref || '#'}
              onClick={(e) => { e.stopPropagation() }}
              className={
                joinHref && (canJoin || isFilledGroup)
                  ? 'w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
                  : 'w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
              }
            >
              <span>Voir détails</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
