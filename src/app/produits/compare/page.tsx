'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, X, CheckCircle, Star, Clock, Package } from 'lucide-react'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { formatProductDetail } from '@/lib/catalog-format'

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
  const [products, setProducts] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const responses = await Promise.all(
          ids.map(id => fetch(`/api/catalog/products/${id}`))
        )

        const data = await Promise.all(
          responses.map(res => res.json())
        )

        const formatted: CompareProduct[] = data
          .filter(item => item.success && item.product)
          .map(item => {
            const product = item.product
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
              rating: 4.7,
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
      <main>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
        <Footer />
      </main>
    )
  }

  if (error || products.length < 2) {
    return (
      <main>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
        <Footer />
      </main>
    )
  }

  // Récupérer toutes les features uniques
  const allFeatures = Array.from(
    new Set(products.flatMap(p => p.features))
  )

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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-600" />
            Comparaison de produits
          </h1>
          <p className="text-gray-600 mt-2">{products.length} produit{products.length > 1 ? 's' : ''} sélectionné{products.length > 1 ? 's' : ''}</p>
        </div>

        {/* Tableau de comparaison */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-64">Caractéristiques</th>
                  {products.map((product) => (
                    <th key={product.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-900 min-w-[280px]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          <Image
                            src={product.image || '/file.svg'}
                            alt={product.name}
                            fill
                            className="object-contain p-2"
                            sizes="128px"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 line-clamp-2">{product.name}</h3>
                          {product.tagline && (
                            <p className="text-xs text-gray-500 mt-1">{product.tagline}</p>
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
              <tbody className="divide-y divide-gray-100">
                {/* Prix */}
                <tr className="bg-emerald-50/50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">Prix</td>
                  {products.map((product) => (
                    <td key={product.id} className="px-6 py-4 text-center">
                      <div className="text-2xl font-bold text-emerald-600">
                        {product.price 
                          ? `${product.price.toLocaleString('fr-FR')} ${product.currency}`
                          : 'Sur devis'
                        }
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Disponibilité */}
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">Disponibilité</td>
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
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">Délai de livraison</td>
                  {products.map((product) => (
                    <td key={product.id} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                        <Clock className="h-4 w-4 text-gray-400" />
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

      <Footer />
    </main>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <main>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
        <Footer />
      </main>
    }>
      <CompareContent />
    </Suspense>
  )
}
