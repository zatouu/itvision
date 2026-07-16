'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Store, BadgeCheck, Star, AlertCircle } from 'lucide-react'

interface VendorProduct {
  id: string
  name: string
  image: string
  price: number | null
  currency: string
  rating?: number
  stockLeft?: number
}

interface VendorInfo {
  name: string
  slug: string
  verified: boolean
  rating: number | null
  productCount: number
}

export default function VendorStorefrontPage() {
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''

  const [vendor, setVendor] = useState<VendorInfo | null>(null)
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    const fetchVendor = async () => {
      try {
        const res = await fetch(`/api/catalog/products?sellerSlug=${encodeURIComponent(slug)}&limit=100`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement')

        const items: VendorProduct[] = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.image || '/placeholder.svg',
          price: typeof p.price === 'number' ? p.price : null,
          currency: 'FCFA',
          rating: p.sellerRating ?? null,
          stockLeft: p.availability?.stockQuantity,
        }))

        setProducts(items)

        if (items.length > 0) {
          const first = data.products[0]
          setVendor({
            name: first.sellerName || slug,
            slug,
            verified: !!first.sellerVerified,
            rating: first.sellerRating ?? null,
            productCount: data.total || items.length,
          })
        } else {
          setVendor({ name: slug, slug, verified: false, rating: null, productCount: 0 })
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchVendor()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-4xl font-bold">{vendor?.name}</h1>
                {vendor?.verified && <BadgeCheck className="w-6 h-6 text-emerald-200" />}
              </div>
              <p className="text-emerald-100 mt-1">
                {vendor?.productCount} produit{vendor?.productCount === 1 ? '' : 's'} en ligne
                {vendor?.rating ? (
                  <span className="inline-flex items-center gap-1 ml-3">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {vendor.rating.toFixed(1)}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
            <p className="text-gray-600">Ce vendeur n&apos;a pas encore de produits en ligne.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/produits/${product.id}`}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition"
              >
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 md:p-4">
                  <h3 className="font-medium text-gray-900 text-sm md:text-base line-clamp-2 mb-2 group-hover:text-emerald-600 transition">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-emerald-700">
                      {product.price !== null
                        ? `${product.price.toLocaleString('fr-FR')} ${product.currency}`
                        : 'Sur devis'}
                    </span>
                    {typeof product.stockLeft === 'number' && product.stockLeft <= 5 && product.stockLeft > 0 ? (
                      <span className="text-xs text-orange-600">{product.stockLeft} restant(s)</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
