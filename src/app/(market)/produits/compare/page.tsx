'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Star, Clock, Package, ShoppingCart, Trash2, TrendingDown } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

interface CompareProduct {
  id: string
  name: string
  image?: string
  price?: number
  currency: string
  requiresQuote: boolean
  features: string[]
  rating: number
  deliveryDays?: number
  availabilityStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  category?: string
  description?: string
  tagline?: string
}

function CompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [products, setProducts] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const removeProduct = (id: string) => {
    const next = products.filter(p => p.id !== id)
    setProducts(next)
    const ids = next.map(p => p.id).join(',')
    if (next.length < 2) {
      router.push('/produits')
    } else {
      router.replace(`/produits/compare?ids=${ids}`, { scroll: false })
    }
  }

  const addToCart = (product: CompareProduct) => {
    try {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem('cart:items')
      const items = raw ? JSON.parse(raw) : []
      const existsIndex = items.findIndex((i: any) => i.id === product.id)
      if (existsIndex >= 0) {
        items[existsIndex].qty += 1
      } else {
        items.push({
          id: product.id,
          name: product.name,
          qty: 1,
          price: product.price,
          currency: product.currency,
          image: product.image,
          requiresQuote: product.requiresQuote
        })
      }
      window.localStorage.setItem('cart:items', JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('cart:updated'))
      addToast(`${product.name} ajouté au panier`, 'success')
    } catch (err) {
      console.error('Failed to add to cart:', err)
      addToast('Erreur lors de l\'ajout au panier', 'error')
    }
  }

  useEffect(() => {
    const idsParam = searchParams.get('ids')
    if (!idsParam) {
      router.push('/produits')
      return
    }

    const ids = idsParam.split(',').filter(Boolean)
    if (ids.length < 2 || ids.length > 3) {
      router.push('/produits')
      return
    }

    const fetchProducts = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/catalog/products?ids=${ids.join(',')}&limit=${ids.length}`)
        const data = await res.json()

        const formatted: CompareProduct[] = (data.success && data.products ? data.products : [])
          .map((product: any) => {
            const pricing = product.pricing || {}
            const bestShipping = pricing.shippingOptions?.[0]
            
            return {
              id: product.id,
              name: product.name,
              image: product.image || product.gallery?.[0],
              price: !product.requiresQuote ? (bestShipping?.total ?? pricing.salePrice) : undefined,
              currency: pricing.currency || 'FCFA',
              requiresQuote: product.requiresQuote || false,
              features: product.features || [],
              rating: product.rating ?? 0,
              deliveryDays: bestShipping?.durationDays ?? product.availability?.leadTimeDays,
              availabilityStatus: (product.availability?.status === 'in_stock' || product.availability?.status === 'preorder' || product.availability?.status === 'out_of_stock')
                ? product.availability.status
                : undefined,
              category: product.category,
              description: product.description,
              tagline: product.tagline
            }
          })

        if (formatted.length < 2) {
          setError('Impossible de charger les produits pour la comparaison')
          return
        }

        setProducts(formatted)
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Erreur lors du chargement des produits')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [searchParams, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-0">
        <MarketHeader />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
        <MarketFooter />
        <MarketBottomNav />
      </main>
    )
  }

  if (error || products.length < 2) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-0">
        <MarketHeader />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Produits introuvables'}</p>
            <Link
              href="/produits"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux produits
            </Link>
          </div>
        </div>
        <MarketFooter />
        <MarketBottomNav />
      </main>
    )
  }

  // Récupérer toutes les features uniques
  const allFeatures = Array.from(
    new Set(products.flatMap(p => p.features))
  )

  const pricedProducts = products.filter(p => typeof p.price === 'number')
  const bestPrice = pricedProducts.length > 0
    ? Math.min(...pricedProducts.map(p => p.price!))
    : null

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-20 md:pb-0">
      <MarketHeader />
      
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-600" />
            Comparaison de produits
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{products.length} produit{products.length > 1 ? 's' : ''} sélectionné{products.length > 1 ? 's' : ''}</p>
        </div>

        {/* Tableau de comparaison */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white w-64">Caractéristiques</th>
                  {products.map((product) => (
                    <th key={product.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white min-w-[260px] relative">
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                        aria-label={`Retirer ${product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <Image
                            src={product.image || '/placeholder.svg'}
                            alt={product.name}
                            fill
                            className="object-contain p-2"
                            sizes="128px"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2">{product.name}</h3>
                          {product.tagline && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.tagline}</p>
                          )}
                        </div>
                        <Link
                          href={`/produits/${product.id}`}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          Voir détails →
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Prix */}
                <tr className="bg-emerald-50/50 dark:bg-emerald-900/10">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white align-middle">Prix</td>
                  {products.map((product) => {
                    const isBest = typeof product.price === 'number' && product.price === bestPrice && products.length > 1
                    return (
                      <td key={product.id} className="px-6 py-4 text-center align-middle">
                        <div className="flex flex-col items-center gap-2">
                          <div className={`text-2xl font-bold ${isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                            {product.price
                              ? `${product.price.toLocaleString('fr-FR')} ${product.currency}`
                              : 'Sur devis'
                            }
                          </div>
                          {isBest && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                              <TrendingDown className="w-3 h-3" /> Meilleur prix
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>

                {/* Disponibilité */}
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Disponibilité</td>
                  {products.map((product) => (
                    <td key={product.id} className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        product.availabilityStatus === 'in_stock'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {product.availabilityStatus === 'in_stock' ? 'En stock' : 'Sur commande'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Délai de livraison */}
                <tr className="bg-gray-50/50 dark:bg-gray-950/40">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Délai de livraison</td>
                  {products.map((product) => (
                    <td key={product.id} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {product.deliveryDays ? `${product.deliveryDays} jours` : 'À définir'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Note */}
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">Note</td>
                  {products.map((product) => (
                    <td key={product.id} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-gray-900">{product.rating.toFixed(1)}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Catégorie */}
                {products.some(p => p.category) && (
                  <tr className="bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">Catégorie</td>
                    {products.map((product) => (
                      <td key={product.id} className="px-6 py-4 text-center text-sm text-gray-700">
                        {product.category || '—'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Description */}
                {products.some(p => p.description) && (
                  <tr>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">Description</td>
                    {products.map((product) => (
                      <td key={product.id} className="px-6 py-4 text-center text-sm text-gray-600 line-clamp-3">
                        {product.description || '—'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Features */}
                {allFeatures.length > 0 && (
                  <tr className="bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">Caractéristiques</td>
                    {products.map((product) => (
                      <td key={product.id} className="px-6 py-4">
                        <ul className="space-y-2">
                          {product.features.length > 0 ? (
                            product.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-gray-400">Aucune caractéristique</li>
                          )}
                        </ul>
                      </td>
                    ))}
                  </tr>
                )}

                {/* Actions */}
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white align-middle">Actions</td>
                  {products.map((product) => (
                    <td key={product.id} className="px-6 py-4 text-center align-middle">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => addToCart(product)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {product.requiresQuote ? 'Demander un devis' : 'Ajouter au panier'}
                        </button>
                        <Link
                          href={`/produits/${product.id}`}
                          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                        >
                          Voir la fiche
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/produits"
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
          >
            Retour aux produits
          </Link>
          <div className="flex gap-2">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/produits/${product.id}`}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition"
              >
                Voir {product.name.split(' ')[0]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <MarketFooter />
      <MarketBottomNav />
    </main>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <main>
        <MarketHeader />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
        <MarketFooter />
        <MarketBottomNav />
      </main>
    }>
      <CompareContent />
    </Suspense>
  )
}
