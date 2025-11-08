"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, CheckCircle, ShoppingCart, Plane, Ship, ArrowRight, Clock, Heart, GitCompare } from 'lucide-react'
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
  availabilityStatus?: 'in_stock' | 'preorder' | string
  detailHref?: string
  isNew?: boolean
  isPopular?: boolean
  createdAt?: string
  onCompareToggle?: (productId: string, isSelected: boolean) => void
  isComparing?: boolean
}

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
  currency = 'Fcfa',
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
  isComparing = false
}: ProductCardProps) {
  // Déterminer si le produit est nouveau (créé il y a moins de 30 jours)
  const isRecentlyNew = createdAt 
    ? (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false
  const showNewBadge = isNew || isRecentlyNew
  const [activeIndex, setActiveIndex] = useState(0)
  const [adding, setAdding] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(shippingOptions[0]?.id ?? null)
  const [isFavorite, setIsFavorite] = useState(false)
  const shippingEnabled = shippingOptions.length > 0 && availabilityStatus !== 'in_stock'
  
  // Vérifier si le produit est en favoris
  useEffect(() => {
    if (typeof window === 'undefined' || !detailHref) return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      const productId = detailHref.split('/').pop()
      setIsFavorite(favorites.some((id: string) => id === productId))
    } catch {
      setIsFavorite(false)
    }
  }, [detailHref])
  
  const toggleFavorite = () => {
    if (typeof window === 'undefined' || !detailHref) return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      const productId = detailHref.split('/').pop()
      
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
    if (!selectedShippingId || !shippingOptions.find(option => option.id === selectedShippingId)) {
      setSelectedShippingId(shippingOptions[0].id)
    }
  }, [shippingOptions, selectedShippingId, shippingEnabled])

  const activeShipping = shippingEnabled && selectedShippingId
    ? shippingOptions.find(option => option.id === selectedShippingId) || null
    : null
  const effectiveCurrency = activeShipping?.currency || currency
  const computedDeliveryDays = activeShipping?.durationDays ?? deliveryDays
  const computedPriceAmount = !requiresQuote
    ? (shippingEnabled && activeShipping ? activeShipping.total : priceAmount)
    : undefined
  const computedPriceLabel = computedPriceAmount && !requiresQuote
    ? `${computedPriceAmount.toLocaleString('fr-FR')} ${effectiveCurrency}`
    : price || 'Sur devis'

  const whatsappUrl = () => {
    const transportLabel = shippingEnabled
      ? activeShipping?.label || 'À définir'
      : 'Retrait / livraison locale Dakar'
    const msg = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${name}${model ? ` (${model})` : ''}.
Mode de transport souhaité: ${transportLabel}.
Merci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${msg}`
  }

  const addToCart = () => {
    try {
      setAdding(true)
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cart:items') : null
      const items = raw ? JSON.parse(raw) : []
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const id = `${name}-${model || ''}${shippingKey}`.replace(/\s+/g, '-').toLowerCase()
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
        items.push({
          id,
          name: `${name}${model ? ` (${model})` : ''}`,
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

  const showQuote = typeof requiresQuote === 'boolean' ? requiresQuote : (price ? /devis/i.test(price) : !computedPriceAmount)
  const isBuy = !!computedPriceAmount && !showQuote && (computedDeliveryDays <= 2)
  const isOrder = !!computedPriceAmount && !showQuote && (computedDeliveryDays > 2)
  const primaryCtaLabel = isBuy ? 'Acheter' : isOrder ? 'Commander' : 'Demander un devis'

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden group hover:shadow-xl hover:border-emerald-400 transition-all h-full flex flex-col relative">
      {/* Badges utiles - charte emerald */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {showNewBadge && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg">
            NOUVEAU
          </div>
        )}
        {isPopular && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg">
            POPULAIRE
          </div>
        )}
        {availabilityStatus === 'in_stock' && !showNewBadge && !isPopular && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg">
            EN STOCK
          </div>
        )}
      </div>
      {computedDeliveryDays > 0 && computedDeliveryDays <= 3 && (
        <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg">
          EXPRESS
        </div>
      )}
      
      <div className="p-2.5 pb-0 relative bg-white">
        <div className="relative w-full aspect-square rounded-md overflow-hidden bg-white border border-gray-100 group-hover:border-emerald-300 transition-all">
          <Image
            src={images[activeIndex] || '/file.svg'}
            alt={name}
            fill
            className="object-contain p-2 transition-transform group-hover:scale-110 duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
          />
          {/* Rating badge style AliExpress - charte emerald */}
          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md text-[11px] font-bold text-gray-800 flex items-center gap-1 shadow-md border border-gray-200">
            <Star className="h-3 w-3 text-emerald-500 fill-emerald-500" /> 
            <span className="text-emerald-600">{rating.toFixed(1)}</span>
          </div>
          
          {/* Boutons actions */}
          {detailHref && (
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleFavorite()
                }}
                className="p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 hover:bg-white transition-colors"
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart 
                  className={`h-3.5 w-3.5 transition-colors ${
                    isFavorite 
                      ? 'text-red-500 fill-red-500' 
                      : 'text-gray-400 hover:text-red-400'
                  }`} 
                />
              </button>
              {onCompareToggle && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const productId = detailHref.split('/').pop() || ''
                    onCompareToggle(productId, !isComparing)
                  }}
                  className={`p-1.5 rounded-full backdrop-blur-sm shadow-md border transition-colors ${
                    isComparing
                      ? 'bg-emerald-500/90 border-emerald-500 text-white'
                      : 'bg-white/90 border-gray-200 text-gray-400 hover:text-emerald-500 hover:border-emerald-300'
                  }`}
                  aria-label={isComparing ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        {/* Miniatures style AliExpress */}
        {images.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {images.slice(0, 5).map((src, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`relative h-10 w-10 rounded border-2 flex-shrink-0 transition-all ${
                  activeIndex === idx 
                    ? 'border-emerald-500 ring-1 ring-emerald-200' 
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
                aria-label={`Image ${idx + 1}`}
              >
                <Image 
                  src={src} 
                  alt={`${name} ${idx + 1}`} 
                  fill 
                  className="object-cover"
                  loading="lazy"
                  sizes="40px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col justify-between flex-1 bg-gray-50">
        {/* Titre style 1688 - compact */}
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 min-h-[2.5rem] mb-1">
            {name}
          </h3>
          {model && (
            <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{model}</p>
          )}
        </div>

        {/* Prix style AliExpress - gros et visible - charte emerald */}
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${showQuote ? 'text-gray-700' : 'text-emerald-600'}`}>
              {computedPriceLabel}
            </span>
            {!showQuote && computedDeliveryDays > 0 && (
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {computedDeliveryDays}j
              </span>
            )}
          </div>
          {showQuote && (
            <div className="text-xs text-gray-500 mt-0.5">Prix sur demande</div>
          )}
        </div>

        {/* Features style 1688 - compact et technique - charte emerald */}
        {features.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {features.slice(0, 2).map((f, i) => (
              <div key={i} className="text-[11px] text-gray-600 line-clamp-1 flex items-center gap-1">
                <span className="text-emerald-500">•</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shipping options style AliExpress - compact - charte emerald */}
        {shippingEnabled && !showQuote && (
          <div className="mb-2 pt-2 border-t border-gray-200">
            <div className="flex flex-wrap gap-1">
              {shippingOptions.slice(0, 2).map(option => {
                const Icon = shippingIcon(option.id)
                const active = option.id === selectedShippingId
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedShippingId(option.id)}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-all flex items-center gap-1 ${
                      active 
                        ? 'bg-emerald-500 text-white border-emerald-500' 
                        : 'border-gray-300 text-gray-600 hover:border-emerald-400 bg-white'
                    }`}
                  >
                    <Icon className="h-3 w-3" /> 
                    <span>{option.durationDays}j</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions style AliExpress - gros boutons - charte emerald */}
        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
          {!!computedPriceAmount && !showQuote && (
            <button
              onClick={addToCart}
              disabled={adding}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-3 py-2 rounded-md text-sm font-bold shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" /> 
              <span>{adding ? '...' : primaryCtaLabel}</span>
            </button>
          )}
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('quote_request', { productId: `${name}-${model || ''}` })}
            className={`inline-flex items-center justify-center gap-1.5 ${
              showQuote 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white' 
                : 'bg-white border-2 border-gray-300 hover:border-emerald-400 text-gray-700'
            } px-3 py-2 rounded-md text-sm font-bold transition-all shadow-sm`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            <span className="text-xs">Contact</span>
          </a>
        </div>

        {/* Link style 1688 - discret - charte emerald */}
        {detailHref && (
          <div className="mt-1.5">
            <Link
              href={detailHref}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors w-full justify-center"
            >
              <span>Voir détails</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
