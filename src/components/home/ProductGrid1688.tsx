'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingCart, FileText, Package, TrendingUp } from 'lucide-react'

interface Product {
  id: string
  name: string
  image?: string
  priceAmount?: number
  b2bPrice?: number
  currency?: string
  category?: string
  rating?: number
  orderCount?: number
  stockStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  isImported?: boolean
  deliveryDays?: number
  priceTiers?: Array<{ minQty: number; price: number }>
  groupBuyEnabled?: boolean
  groupBuyBestPrice?: number
}

function formatPrice(price?: number, currency?: string) {
  if (!price) return '—'
  return `${price.toLocaleString('fr-FR')} ${currency || 'FCFA'}`
}

export default function ProductGrid1688({
  title,
  subtitle,
  endpoint,
  limit = 8,
  showTiers = false,
}: {
  title: string
  subtitle?: string
  endpoint: string
  limit?: number
  showTiers?: boolean
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${endpoint}?limit=${limit}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = data?.items || data?.products || []
        setProducts(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [endpoint, limit])

  if (loading) {
    return (
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="h-80 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section className="py-12 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group relative rounded-2xl border border-slate-200 bg-white hover:shadow-lg hover:border-slate-300 transition-all overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-48 bg-slate-50 overflow-hidden">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="300px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package className="h-8 w-8" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {p.isImported && (
                    <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                      Import Chine
                    </span>
                  )}
                  {p.stockStatus === 'in_stock' && (
                    <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                      Stock Dakar
                    </span>
                  )}
                  {p.groupBuyEnabled && (
                    <span className="bg-orange-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                      Achat groupé
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-medium text-slate-800 text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                  {p.name}
                </h3>

                {/* Origin + delivery */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {p.isImported ? (
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      🇨🇳 Import Chine · {p.deliveryDays ? `${p.deliveryDays} jours` : '10 jours'}
                    </span>
                  ) : p.stockStatus === 'in_stock' ? (
                    <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                      🇸🇳 Stock Dakar · Livraison 1-2j
                    </span>
                  ) : null}
                </div>

                {/* Rating + orders */}
                <div className="flex items-center gap-2 mb-2">
                  {p.rating && p.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-700">{p.rating.toFixed(1)}</span>
                    </span>
                  )}
                  {p.orderCount && p.orderCount > 0 && (
                    <span className="text-xs text-slate-400">{p.orderCount} commandes</span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-3">
                  {p.b2bPrice && p.b2bPrice > (p.priceAmount || 0) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 line-through">{formatPrice(p.b2bPrice, p.currency)}</span>
                      <span className="text-lg font-bold text-slate-900">{formatPrice(p.priceAmount, p.currency)}</span>
                      <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">
                        -{Math.round(((p.b2bPrice - (p.priceAmount || 0)) / p.b2bPrice) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-slate-900">{formatPrice(p.priceAmount, p.currency)}</span>
                  )}
                  {p.groupBuyEnabled && p.groupBuyBestPrice && p.groupBuyBestPrice < (p.priceAmount || 0) && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                      <TrendingUp className="h-3 w-3" />
                      Groupé : {formatPrice(p.groupBuyBestPrice, p.currency)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/produits/${p.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-medium text-xs transition-colors"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Ajouter
                  </Link>
                  {p.isImported && (
                    <Link
                      href={`/produits/${p.id}?tab=quote`}
                      className="inline-flex items-center justify-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-2 rounded-lg transition-colors"
                      title="Demander un devis"
                    >
                      <FileText className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
