"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
    const modelText = model ? ` (${model})` : ''
    const msg = encodeURIComponent(
      `Bonjour, je souhaite un devis pour: ${name}${modelText}.\nMode de transport souhaité: ${transportLabel}.\nMerci de me recontacter.`
    )
    return `https://wa.me/221774133440?text=${msg}`
  }

  const addToCart = () => {
    try {
      setAdding(true)
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cart:items') : null
      const items = raw ? JSON.parse(raw) : []
      const shippingKey = activeShipping ? `-${activeShipping.id}` : ''
      const productName = `${name}-${model || ''}${shippingKey}`
      const id = productName.replace(/\s+/g, '-').toLowerCase()
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

  const devisRegex = /devis/i
  const showQuote = typeof requiresQuote === 'boolean' ? requiresQuote : (price ? devisRegex.test(price) : !computedPriceAmount)
  const isBuy = !!computedPriceAmount && !showQuote && (computedDeliveryDays <= 2)
  const isOrder = !!computedPriceAmount && !showQuote && (computedDeliveryDays > 2)
  const primaryCtaLabel = isBuy ? 'Acheter' : isOrder ? 'Commander' : 'Demander un devis'

  const handleCardClick = () => {
    if (detailHref && typeof window !== 'undefined') {
      window.location.href = detailHref
    }
  }

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-300 transition-all duration-300 h-full flex flex-col relative transform hover:-translate-y-1 cursor-pointer"
    >
        {/* Badges modernes */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {showNewBadge && (
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm">
              NOUVEAU
            </div>
          )}
          {isPopular && (
            <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm">
              ⭐ POPULAIRE
            </div>
          )}
          {availabilityStatus === 'in_stock' && !showNewBadge && !isPopular && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm">
              ✓ EN STOCK
            </div>
          )}
        </div>
        {computedDeliveryDays > 0 && computedDeliveryDays <= 3 && (
          <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm">
            ⚡ EXPRESS
          </div>
        )}
        
        {/* Zone image avec effet moderne */}
        <div className="relative bg-gradient-to-br from-gray-50 to-white p-4">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 group-hover:border-emerald-300 transition-all duration-300 shadow-inner">
            <Image
              src={images[activeIndex] || '/file.svg'}
              alt={name}
              fill
              className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
            />
            {/* Rating badge moderne */}
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-gray-800 flex items-center gap-1.5 shadow-lg border border-gray-200/50">
              <Star className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" /> 
              <span className="text-emerald-600">{rating.toFixed(1)}</span>
            </div>
            
            {/* Boutons actions flottants */}
            {detailHref && (
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleFavorite()
                  }}
                  className="p-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 hover:bg-white hover:scale-110 transition-all"
                  aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Heart 
                    className={`h-4 w-4 transition-colors ${
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
                    className={`p-2 rounded-full backdrop-blur-md shadow-lg border transition-all hover:scale-110 ${
                      isComparing
                        ? 'bg-emerald-500/95 border-emerald-500 text-white'
                        : 'bg-white/95 border-gray-200 text-gray-400 hover:text-emerald-500 hover:border-emerald-300'
                    }`}
                    aria-label={isComparing ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
                  >
                    <GitCompare className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Miniatures modernes */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
              {images.slice(0, 5).map((src, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setActiveIndex(idx)
                  }}
                  className={`relative h-12 w-12 rounded-lg border-2 flex-shrink-0 transition-all ${
                    activeIndex === idx 
                      ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-md scale-110' 
                      : 'border-gray-200 hover:border-emerald-300 hover:scale-105'
                  }`}
                  aria-label={`Image ${idx + 1}`}
                >
                  <Image 
                    src={src} 
                    alt={`${name} ${idx + 1}`} 
                    fill 
                    className="object-cover rounded"
                    loading="lazy"
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenu produit */}
        <div className="p-4 flex flex-col justify-between flex-1 bg-white">
          {/* Titre et modèle */}
          <div className="mb-3">
            <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-2 min-h-[3rem] mb-1.5 group-hover:text-emerald-600 transition-colors">
              {name}
            </h3>
            {model && (
              <p className="text-xs text-gray-500 line-clamp-1 mb-2">{model}</p>
            )}
          </div>

          {/* Prix moderne et visible */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold ${showQuote ? 'text-gray-700' : 'bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent'}`}>
                {computedPriceLabel}
              </span>
              {!showQuote && computedDeliveryDays > 0 && (
                <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Clock className="h-3 w-3" />
                  {computedDeliveryDays}j
                </span>
              )}
            </div>
            {showQuote && (
              <div className="text-sm text-gray-600 mt-1 font-medium">Prix sur demande</div>
            )}
          </div>

          {/* Features compactes */}
          {features.length > 0 && (
            <div className="mb-3 space-y-1">
              {features.slice(0, 2).map((f, i) => (
                <div key={i} className="text-xs text-gray-600 line-clamp-1 flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Options de livraison */}
          {shippingEnabled && !showQuote && (
            <div className="mb-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-1.5">
                {shippingOptions.slice(0, 2).map(option => {
                  const Icon = shippingIcon(option.id)
                  const active = option.id === selectedShippingId
                  return (
                    <button
                      key={option.id}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedShippingId(option.id)
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                        active 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-md' 
                          : 'border-gray-200 text-gray-600 hover:border-emerald-400 bg-white hover:bg-emerald-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> 
                      <span>{option.durationDays}j</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions modernes */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2">
            {!!computedPriceAmount && !showQuote && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  addToCart()
                }}
                disabled={adding}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all hover:shadow-xl disabled:opacity-50 transform hover:scale-105"
              >
                <ShoppingCart className="h-4 w-4" /> 
                <span>{adding ? '...' : primaryCtaLabel}</span>
              </button>
            )}
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation()
                trackEvent('quote_request', { productId: `${name}-${model || ''}` })
              }}
              className={`inline-flex items-center justify-center gap-1.5 ${
                showQuote 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white' 
                  : 'bg-white border-2 border-gray-200 hover:border-emerald-400 text-gray-700 hover:bg-emerald-50'
              } px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
              </svg>
              <span className="text-xs">Contact</span>
            </a>
          </div>

          {/* Lien détails */}
          {detailHref && (
            <div className="mt-3 text-center">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors group-hover:gap-2">
                <span>Voir détails</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
