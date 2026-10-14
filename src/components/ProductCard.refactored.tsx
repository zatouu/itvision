/**
 * ProductCard Refactoré
 * 
 * Fonctionnalités :
 * - Mode "1688 transparent" : Affichage détaillé du pricing 1688
 * - Affichage transport dynamique : Sélection et calcul en temps réel
 * - Badge "CHINE DIRECT" pour produits 1688
 * - Intégration pricing complet
 */

"use client"

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { Star, ShoppingCart, Plane, Ship, Clock, Heart, Info, TrendingUp, DollarSign } from 'lucide-react'
import { trackEvent } from '@/utils/analytics'
import type { ProductSummary, Pricing1688Data, ShippingOption } from '@/lib/types/product.types'

interface ProductCardProps {
  id: string
  name: string
  tagline?: string | null
  category?: string | null
  image: string
  gallery?: string[]
  priceAmount: number | null
  currency: string
  requiresQuote: boolean
  availabilityStatus: 'in_stock' | 'preorder' | 'out_of_stock'
  availabilityLabel: string
  shippingOptions: ShippingOption[]
  deliveryDays: number | null
  pricing1688: Pricing1688Data | null
  rating?: number
  isFeatured?: boolean
  createdAt?: string | null
  detailHref?: string
  onCompareToggle?: (productId: string, isSelected: boolean) => void
  isComparing?: boolean
  // Mode 1688 transparent
  show1688Transparent?: boolean
}

const shippingIcon = (methodId?: string) => {
  if (!methodId) return Plane
  if (methodId.includes('sea')) return Ship
  return Plane
}

export default function ProductCard({
  id,
  name,
  tagline,
  category,
  image,
  gallery = [],
  priceAmount,
  currency = 'FCFA',
  requiresQuote,
  availabilityStatus,
  availabilityLabel,
  shippingOptions,
  deliveryDays,
  pricing1688,
  rating = 4.5,
  isFeatured = false,
  createdAt,
  detailHref,
  onCompareToggle,
  isComparing = false,
  show1688Transparent = false
}: ProductCardProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [adding, setAdding] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [show1688Details, setShow1688Details] = useState(false)

  // Images
  const imagesList = useMemo(() => {
    if (gallery.length > 0) return gallery
    if (image) return [image]
    return ['/file.svg']
  }, [gallery, image])

  // Badge nouveau
  const isRecentlyNew = useMemo(() => {
    if (!createdAt) return false
    const daysDiff = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff < 30
  }, [createdAt])

  // Option transport par défaut
  useEffect(() => {
    if (shippingOptions.length > 0 && !selectedShippingId) {
      const option15j = shippingOptions.find(opt => opt.durationDays === 15)
      setSelectedShippingId(option15j?.id || shippingOptions[0]?.id || null)
    }
  }, [shippingOptions, selectedShippingId])

  // Favoris
  useEffect(() => {
    if (typeof window === 'undefined' || !detailHref) return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      setIsFavorite(favorites.includes(id))
    } catch {
      setIsFavorite(false)
    }
  }, [id, detailHref])

  // Prix calculé avec transport
  const calculatedPrice = useMemo(() => {
    if (requiresQuote) return null
    if (!priceAmount) return null
    
    const selectedShipping = shippingOptions.find(opt => opt.id === selectedShippingId)
    if (selectedShipping) {
      return priceAmount + selectedShipping.cost
    }
    return priceAmount
  }, [priceAmount, shippingOptions, selectedShippingId, requiresQuote])

  // Toggle favoris
  const toggleFavorite = () => {
    if (typeof window === 'undefined') return
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      const newFavorites = isFavorite
        ? favorites.filter((favId: string) => favId !== id)
        : [...favorites, id]
      localStorage.setItem('wishlist:items', JSON.stringify(newFavorites))
      setIsFavorite(!isFavorite)
      trackEvent('toggle_favorite', { productId: id, isFavorite: !isFavorite })
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Ajouter au panier
  const addToCart = () => {
    if (!detailHref) return
    setAdding(true)
    try {
      const items = JSON.parse(localStorage.getItem('cart:items') || '[]')
      const productId = detailHref.split('/').pop()
      
      const existingIndex = items.findIndex((item: any) => item.id === productId)
      const cartItem = {
        id: productId,
        name,
        qty: 1,
        price: priceAmount || 0,
        currency,
        requiresQuote,
        shipping: selectedShippingId ? shippingOptions.find(opt => opt.id === selectedShippingId) : undefined
      }

      if (existingIndex >= 0) {
        items[existingIndex].qty += 1
      } else {
        items.push(cartItem)
      }

      localStorage.setItem('cart:items', JSON.stringify(items))
      trackEvent('add_to_cart', { productId, quantity: 1 })
      window.dispatchEvent(new CustomEvent('cart:updated'))
      
      setTimeout(() => setAdding(false), 500)
    } catch (error) {
      console.error('Error adding to cart:', error)
      setAdding(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'Sur devis'
    return `${amount.toLocaleString('fr-FR')} ${currency}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Image avec badges */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <Image
          src={imagesList[activeIndex] || '/file.svg'}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {isRecentlyNew && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">NOUVEAU</span>
          )}
          {pricing1688 && (
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">CHINE DIRECT</span>
          )}
          {availabilityStatus === 'in_stock' && !isRecentlyNew && !pricing1688 && (
            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">EN STOCK</span>
          )}
          {availabilityStatus === 'preorder' && !isRecentlyNew && !pricing1688 && (
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">SUR COMMANDE</span>
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
      <div className="p-4 space-y-3">
        {/* Titre */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
            {name}
          </h3>
          {tagline && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tagline}</p>
          )}
        </div>

        {/* Pricing 1688 Transparent */}
        {show1688Transparent && pricing1688 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-900">Prix d'origine</span>
              </div>
              <button
                onClick={() => setShow1688Details(!show1688Details)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {show1688Details ? 'Masquer' : 'Détails'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Prix direct</span>
              <span className="text-sm font-bold text-gray-900">
                {pricing1688.price1688.toLocaleString('fr-FR')} {pricing1688.price1688Currency}
              </span>
            </div>

            {show1688Details && pricing1688.breakdown && (
              <div className="pt-2 border-t border-blue-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Coût produit:</span>
                  <span className="font-medium">{pricing1688.breakdown.productCostFCFA.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Transport:</span>
                  <span className="font-medium">{pricing1688.breakdown.shippingCostClient.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Marge nette:</span>
                  <span>{pricing1688.breakdown.netMargin.toLocaleString('fr-FR')} FCFA ({pricing1688.breakdown.marginPercentage.toFixed(2)}%)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prix */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(calculatedPrice || priceAmount)}
          </span>
          {calculatedPrice && priceAmount && calculatedPrice > priceAmount && (
            <span className="text-xs text-gray-500">
              (dont transport: {formatCurrency(calculatedPrice - priceAmount)})
            </span>
          )}
        </div>

        {/* Transport dynamique */}
        {shippingOptions.length > 0 && availabilityStatus !== 'in_stock' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Mode de livraison:</label>
            <select
              value={selectedShippingId || ''}
              onChange={(e) => setSelectedShippingId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {shippingOptions.map((option) => {
                const Icon = shippingIcon(option.id)
                return (
                  <option key={option.id} value={option.id}>
                    {option.label} - {formatCurrency(option.total)}
                  </option>
                )
              })}
            </select>
            {selectedShippingId && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span>
                  {shippingOptions.find(opt => opt.id === selectedShippingId)?.durationDays || deliveryDays || 0} jours
                </span>
              </div>
            )}
          </div>
        )}

        {/* Disponibilité */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded font-medium ${
            availabilityStatus === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
            availabilityStatus === 'preorder' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {availabilityLabel}
          </span>
          {deliveryDays !== null && deliveryDays > 0 && (
            <span className="text-gray-500">
              <Clock className="h-3 w-3 inline mr-1" />
              {deliveryDays}j
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={addToCart}
            disabled={adding || requiresQuote}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                <span>Ajout...</span>
              </>
            ) : requiresQuote ? (
              <>
                <Info className="h-4 w-4" />
                <span>Devis</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                <span>Ajouter</span>
              </>
            )}
          </button>
          {onCompareToggle && (
            <button
              onClick={() => onCompareToggle(id, !isComparing)}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                isComparing
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

