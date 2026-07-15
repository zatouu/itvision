'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Heart, Star } from 'lucide-react'
import { popularProducts, productTabs, mapCatalogToHomeProduct } from '@/lib/home-data'
import type { HomeProduct } from '@/lib/home-data'

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString('fr-FR')} ${currency}`
}

function ProductCard({ p, idx }: { p: HomeProduct; idx: number }) {
  return (
    <motion.div
      key={p.id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.04 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <Link href={`/produits/${p.id}`} className="block">
        <div className="relative aspect-square">
          <img
            src={p.image}
            alt={p.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {p.badges?.map((b) => (
              <span key={b} className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {b}
              </span>
            ))}
            {p.deliveryDays && !p.badges?.length && (
              <span className="bg-emerald-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                🚚 {p.deliveryDays}j
              </span>
            )}
            {p.soldCount && p.soldCount > 200 && (
              <span className="bg-amber-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                🔥 Hot
              </span>
            )}
          </div>
          {/* Heart */}
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            className="absolute top-2 right-2 w-7 h-7 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Ajouter aux favoris"
          >
            <Heart className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-3">
          <h3 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mb-2 min-h-[2rem]">
            {p.name}
          </h3>

          {/* Rating + sold */}
          <div className="flex items-center gap-2 mb-1.5">
            {p.rating && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{p.rating.toFixed(1)}</span>
              </span>
            )}
            {p.soldCount && (
              <span className="text-[10px] text-slate-400">{p.soldCount} vendus</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-bold text-emerald-600">
              {formatPrice(p.price, p.currency)}
            </span>
            {p.originalPrice && (
              <span className="text-[10px] text-slate-400 line-through">
                {formatPrice(p.originalPrice, p.currency)}
              </span>
            )}
          </div>

          {/* Origin */}
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{p.origin}</span>
        </div>
      </Link>
    </motion.div>
  )
}

export default function PopularProducts() {
  const [activeTab, setActiveTab] = useState('Tous')
  const [products, setProducts] = useState<HomeProduct[]>(popularProducts)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog/products?limit=10&sortBy=rating-desc')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = data?.products || data?.items || []
        if (items.length > 0) {
          setProducts(items.map(mapCatalogToHomeProduct))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = activeTab === 'Tous'
    ? products
    : products.filter((p) => {
        const name = p.name.toLowerCase()
        if (activeTab === 'Mode') return name.includes('robe') || name.includes('sac') || name.includes('sneakers') || name.includes('t-shirt') || name.includes('chaussure')
        if (activeTab === 'Maison') return name.includes('friteuse') || name.includes('cuisine') || name.includes('déco') || name.includes('meuble') || name.includes('lampe')
        if (activeTab === 'Tech') return name.includes('smartwatch') || name.includes('écouteur') || name.includes('support') || name.includes('caméra') || name.includes(' téléphone')
        if (activeTab === 'Beauté') return name.includes('rouge') || name.includes('maquillage') || name.includes('cheveux') || name.includes('parfum') || name.includes('crème')
        if (activeTab === 'Sport') return name.includes('sneakers') || name.includes('running') || name.includes('fitness') || name.includes('vélo')
        if (activeTab === 'Auto') return name.includes('voiture') || name.includes('gps') || name.includes('auto') || name.includes('moto')
        return true
      })

  if (!loading && products.length === 0) return null

  return (
    <section className="py-8 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">🔥 Produits populaires</h2>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {productTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition border ${
                tab === activeTab
                  ? 'bg-emerald-500 text-white border-emerald-500 font-medium'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                <div className="aspect-square bg-slate-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded w-2/3 animate-pulse" />
                  <div className="h-5 bg-slate-100 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} p={p} idx={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
