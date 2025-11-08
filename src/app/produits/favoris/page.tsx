'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'
import { Heart, Package, ArrowLeft, Trash2 } from 'lucide-react'

interface WishlistProduct {
  _id: string
  name: string
  category: string
  description: string
  tagline?: string
  priceAmount?: number
  currency?: string
  image?: string
  gallery?: string[]
  requiresQuote: boolean
  deliveryDays?: number
  features: string[]
  rating: number
  shippingOptions: any[]
  availabilityStatus?: string
  createdAt?: string
}

export default function WishlistPage() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [products, setProducts] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
      setFavoriteIds(favorites)
      
      if (favorites.length === 0) {
        setLoading(false)
        return
      }

      // Charger les produits favoris
      const fetchFavorites = async () => {
        try {
          setLoading(true)
          const responses = await Promise.all(
            favorites.map(id => fetch(`/api/catalog/products/${id}`))
          )

          const data = await Promise.all(
            responses.map(res => res.json())
          )

          const formatted: WishlistProduct[] = data
            .filter(item => item.success && item.product)
            .map(item => {
              const product = item.product
              const pricing = product.pricing || {}
              const bestShipping = pricing.shippingOptions?.[0]
              
              return {
                _id: product.id,
                name: product.name,
                category: product.category || 'Catalogue import Chine',
                description: product.description || '',
                tagline: product.tagline,
                priceAmount: !product.requiresQuote ? (bestShipping?.total ?? pricing.salePrice) : undefined,
                currency: pricing.currency || 'FCFA',
                requiresQuote: product.requiresQuote || false,
                deliveryDays: bestShipping?.durationDays ?? product.availability?.leadTimeDays,
                features: product.features || [],
                rating: 4.7,
                shippingOptions: pricing.shippingOptions || [],
                availabilityStatus: product.availability?.status,
                createdAt: product.createdAt
              }
            })

          setProducts(formatted)
        } catch (err) {
          console.error('Error fetching favorites:', err)
          setError('Erreur lors du chargement des favoris')
        } finally {
          setLoading(false)
        }
      }

      fetchFavorites()
    } catch {
      setLoading(false)
    }
  }, [])

  // Écouter les mises à jour de la wishlist
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleWishlistUpdate = () => {
      try {
        const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
        setFavoriteIds(favorites)
        
        if (favorites.length === 0) {
          setProducts([])
          return
        }

        // Recharger les produits si nécessaire
        const currentIds = products.map(p => p._id)
        const newIds = favorites.filter((id: string) => !currentIds.includes(id))
        const removedIds = currentIds.filter(id => !favorites.includes(id))
        
        if (removedIds.length > 0) {
          setProducts(prev => prev.filter(p => !removedIds.includes(p._id)))
        }
      } catch {
        // Ignore
      }
    }
    
    window.addEventListener('wishlist:updated', handleWishlistUpdate)
    return () => window.removeEventListener('wishlist:updated', handleWishlistUpdate)
  }, [products])

  const clearAll = () => {
    if (typeof window === 'undefined') return
    if (confirm('Voulez-vous retirer tous les produits de vos favoris ?')) {
      localStorage.setItem('wishlist:items', JSON.stringify([]))
      setFavoriteIds([])
      setProducts([])
      window.dispatchEvent(new CustomEvent('wishlist:updated'))
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* En-tête */}
        <div className="mb-8">
          <Link
            href="/produits"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux produits
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                </div>
                Mes Favoris
              </h1>
              <p className="text-gray-600 mt-2">
                {products.length} produit{products.length > 1 ? 's' : ''} sauvegardé{products.length > 1 ? 's' : ''}
              </p>
            </div>
            {products.length > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 className="h-4 w-4" />
                Tout retirer
              </button>
            )}
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/produits"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Retour aux produits
            </Link>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Heart className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun favori</h3>
            <p className="text-gray-600 mb-6">Vous n'avez pas encore ajouté de produits à vos favoris.</p>
            <Link
              href="/produits"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition"
            >
              <Package className="h-5 w-5" />
              Parcourir les produits
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                name={product.name}
                model={product.tagline}
                price={product.priceAmount ? `${product.priceAmount.toLocaleString('fr-FR')} ${product.currency || 'FCFA'}` : 'Sur devis'}
                priceAmount={product.priceAmount}
                currency={product.currency || 'FCFA'}
                requiresQuote={product.requiresQuote}
                deliveryDays={product.deliveryDays || 0}
                features={product.features && product.features.length ? product.features.filter(Boolean) : [product.description]}
                rating={product.rating || 4.7}
                images={product.gallery && product.gallery.length ? product.gallery : [product.image || '/file.svg']}
                shippingOptions={product.shippingOptions}
                availabilityStatus={product.availabilityStatus}
                detailHref={`/produits/${product._id}`}
                isPopular={product.rating >= 4.8}
                createdAt={product.createdAt}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
