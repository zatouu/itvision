'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'
import { Heart, Package, ArrowLeft, Trash2, X } from 'lucide-react'

interface WishlistProduct {
  id: string
  _id?: string // Deprecated - utiliser id
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
  availabilityStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  createdAt?: string
  isImported?: boolean
  // Données physiques pour le transport (si disponibles)
  weightKg?: number
  grossWeightKg?: number
  netWeightKg?: number
  volumeM3?: number
}

export default function WishlistPage() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [products, setProducts] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const removeOne = async (productId: string) => {
    if (typeof window === 'undefined') return
    const id = (productId || '').trim()
    if (!id) return

    try {
      const raw = localStorage.getItem('wishlist:items')
      const favorites = raw ? JSON.parse(raw) : []
      const nextIds = (Array.isArray(favorites) ? favorites : []).filter((x: any) => typeof x === 'string' && x !== id)

      localStorage.setItem('wishlist:items', JSON.stringify(nextIds))
      setFavoriteIds(nextIds)
      setProducts(prev => prev.filter(p => (p.id || p._id) !== id))
      window.dispatchEvent(new CustomEvent('wishlist:updated'))

      // Persister côté DB si connecté (ignore 401)
      fetch(`/api/favorites?productId=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null)
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadIds = async (): Promise<string[]> => {
      // 1) Essayer DB (si connecté)
      try {
        const res = await fetch('/api/favorites', { method: 'GET' })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          const serverIds: string[] = Array.isArray(data?.favorites) ? data.favorites.filter((x: any) => typeof x === 'string') : []
          // Sync localStorage
          localStorage.setItem('wishlist:items', JSON.stringify(serverIds))
          window.dispatchEvent(new CustomEvent('wishlist:updated'))
          return serverIds
        }
      } catch {
        // ignore
      }

      // 2) Fallback localStorage (invité)
      try {
        const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
        return Array.isArray(favorites) ? favorites : []
      } catch {
        return []
      }
    }

    const fetchFavorites = async (favorites: string[]) => {
      try {
        setLoading(true)
        const responses = await Promise.all(
          favorites.map((id: string) => fetch(`/api/catalog/products/${id}`))
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
              id: product.id,
              _id: product.id, // Compatibilité
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
              availabilityStatus: (product.availability?.status === 'in_stock' || product.availability?.status === 'preorder' || product.availability?.status === 'out_of_stock')
                ? product.availability.status
                : undefined,
              createdAt: product.createdAt,
              isImported: !!product.isImported,
              // Données physiques: l'API detail renvoie logistics/weights
              weightKg: typeof product.logistics?.weightKg === 'number' ? product.logistics.weightKg : undefined,
              grossWeightKg: typeof product.weights?.grossWeightKg === 'number' ? product.weights.grossWeightKg : undefined,
              netWeightKg: typeof product.weights?.netWeightKg === 'number' ? product.weights.netWeightKg : undefined,
              volumeM3: typeof product.logistics?.volumeM3 === 'number' ? product.logistics.volumeM3 : undefined
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

    ;(async () => {
      const ids = await loadIds()
      setFavoriteIds(ids)
      if (ids.length === 0) {
        setLoading(false)
        return
      }
      await fetchFavorites(ids)
    })()
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

      // Si connecté, persister aussi côté DB
      fetch('/api/favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: [] })
      }).catch(() => null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* En-tête */}
        <div className="mb-8">
          <Link
            href="/produits"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux produits
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                </div>
                Mes Favoris
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
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
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Heart className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucun favori</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Vous n'avez pas encore ajouté de produits à vos favoris.</p>
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
            {products.map((product) => {
              const pid = String(product.id || product._id || '')
              return (
                <div key={pid} className="relative">
                  <button
                    type="button"
                    onClick={() => removeOne(pid)}
                    className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-red-600 dark:border-gray-800 dark:bg-gray-950/80 dark:text-gray-200 dark:hover:text-red-300"
                    aria-label="Retirer des favoris"
                    title="Retirer des favoris"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <ProductCard
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
                    detailHref={`/produits/${pid}`}
                    favoriteButtonEnabled={false}
                    isPopular={product.rating >= 4.8}
                    createdAt={product.createdAt}
                    isImported={product.isImported}
                    unitWeightKg={product.weightKg ?? product.grossWeightKg ?? product.netWeightKg}
                    unitVolumeM3={product.volumeM3}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
