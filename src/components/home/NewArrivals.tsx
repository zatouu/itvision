'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { mapCatalogToHomeProduct } from '@/lib/home-data'
import type { HomeProduct } from '@/lib/home-data'

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString('fr-FR')} ${currency}`
}

export default function NewArrivals() {
  const [products, setProducts] = useState<HomeProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog/products?limit=10&sortBy=createdAt-desc')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = data?.products || data?.items || []
        if (items.length > 0) {
          setProducts(items.map(mapCatalogToHomeProduct).slice(0, 10))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <section className="py-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-slate-900 dark:text-white">Nouveautés</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Les derniers produits ajoutés au catalogue</p>
            </div>
          </div>
          <Link href="/produits?sort=createdAt-desc" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition">
            Voir tout →
          </Link>
        </div>

        {/* Horizontal scroll products */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="snap-start flex-shrink-0 w-[180px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="h-[180px] bg-slate-100 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse" />
                    <div className="h-1.5 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              ))
            : products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="snap-start flex-shrink-0 w-[180px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <Link href={`/produits/${p.id}`} className="block">
                  <div className="relative h-[180px]">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Nouveau
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mb-2 min-h-[2rem]">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatPrice(p.price, p.currency)}
                      </span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {formatPrice(p.originalPrice, p.currency)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{p.origin}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  )
}
