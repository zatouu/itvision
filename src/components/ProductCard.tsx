"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, ShoppingCart, Plane, Ship, Clock, Heart } from 'lucide-react'
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
  isImported = false
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
  const computedPriceAmount = !requiresQuote
    ? (shippingEnabled && activeShipping ? activeShipping.total : priceAmount)
    : undefined
  const computedPriceLabel = computedPriceAmount && !requiresQuote
    ? `${computedPriceAmount.toLocaleString('fr-FR')} ${effectiveCurrency}`
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
        items[existsIndex].price = computedPriceAmount
        items[existsIndex].currency = effectiveCurrency
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
          price: computedPriceAmount,
          currency: effectiveCurrency,
          requiresQuote: !!requiresQuote,
          shipping: activeShipping ? {
            id: activeShipping.id,
            label: activeShipping.label,
            durationDays: activeShipping.durationDays,
            cost: activeShipping.cost,
            currency: activeShipping.currency
          } : undefined
        })
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
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {showNewBadge && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">NOUVEAU</span>
          )}
          {isPopular && !showNewBadge && (
            <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-white" />
              TOP VENTE
            </span>
          )}
          {isImported && !isInStock && (
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">IMPORT</span>
          )}
          {isInStock && (
            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">EN STOCK DAKAR</span>
          )}
          {!isInStock && !showNewBadge && !isImported && !isPopular && (
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">SUR COMMANDE</span>
          )}
        </div>
        
        {/* Favoris */}
        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors z-10"
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
        </button>
        
        {/* Rating */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-sm">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          <span>{rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col flex-1">
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
          {!showQuote && shippingEnabled && activeShipping && (
            <div className="text-xs text-gray-500 mt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{computedDeliveryDays} jours</span>
              </div>
              {basePrice > 0 && activeShipping.total !== basePrice && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Base: {basePrice.toLocaleString('fr-FR')} {currency} + Transport: {activeShipping.cost.toLocaleString('fr-FR')} {activeShipping.currency}
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

        {/* Options de livraison avec switch (pour produits sur commande) */}
        {shippingEnabled && !showQuote && shippingOptions.length > 0 && (
          <div className="mb-3 space-y-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs font-semibold text-gray-700 mb-2">Choisir la durée :</div>
            <div className="flex flex-wrap gap-2">
              {shippingOptions.map(option => {
                const Icon = shippingIcon(option.id)
                const active = option.id === selectedShippingId
                return (
                  <button
                    key={option.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedShippingId(option.id)
                    }}
                    className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                      active 
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-105' 
                        : 'border-gray-300 text-gray-700 hover:border-emerald-400 bg-white hover:bg-emerald-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-500'}`} />
                    <span className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-700'}`}>
                      {option.durationDays}j
                    </span>
                    {active && (
                      <span className="text-[10px] font-semibold text-emerald-100">
                        {option.total.toLocaleString('fr-FR')} {option.currency}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {activeShipping && (
              <div className="text-[10px] text-gray-600 mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span>Transport {activeShipping.label}:</span>
                  <span className="font-semibold">{activeShipping.cost.toLocaleString('fr-FR')} {activeShipping.currency}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          {!showQuote && (
            <button
              onClick={addToCart}
              disabled={adding}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{adding ? '...' : primaryCtaLabel}</span>
            </button>
          )}
          {showQuote && (
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation()
                trackEvent('quote_request', { productId: name })
              }}
              className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
              </svg>
              <span>Demander un devis</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
