'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Store, Package } from 'lucide-react'

interface ProductItem {
  id: string
  name: string
  slug?: string
  category?: string
  image?: string
  price: number | null
  currency: string
  stockStatus?: string
  stockQuantity?: number
  isFeatured?: boolean
}

interface ShopPageClientProps {
  shopId: string
  shopName: string
  shopSlug: string
  shopLogo?: string
  shopDescription?: string
}

export default function ShopPageClient({ shopId, shopName, shopLogo, shopDescription }: ShopPageClientProps) {
  const [items, setItems] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 24

  useEffect(() => { loadProducts(1) }, [shopId])

  const loadProducts = async (p: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/shops/${shopId}/products?page=${p}&limit=${limit}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setItems(data.items || [])
      setTotal(data.pagination?.total || 0)
      setPage(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const pages = Math.ceil(total / limit)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 flex items-start gap-4">
        <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
          {shopLogo ? (
            <Image src={shopLogo} alt={shopName} width={80} height={80} className="object-cover w-full h-full" />
          ) : (
            <Store className="h-8 w-8 text-gray-400" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
          {shopDescription && <p className="text-gray-600 mt-1 max-w-2xl">{shopDescription}</p>}
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
            <Package className="h-4 w-4" />
            <span>{total} produit{total > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Cette boutique n'a pas encore de produits en ligne.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/produits/${item.slug || item.id}`}
              className="group block rounded-2xl border border-gray-200 bg-white overflow-hidden transition hover:shadow-lg hover:border-emerald-300"
            >
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <Package className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition">{item.name}</h3>
                {item.price !== null && (
                  <p className="mt-2 font-bold text-emerald-700">
                    {item.price.toLocaleString('fr-FR')} {item.currency}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && !loading && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => loadProducts(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${page === p ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
