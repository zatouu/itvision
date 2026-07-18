'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { flashSaleProducts, flashSaleEndTime, mapCatalogToFlashProduct } from '@/lib/home-data'
import type { HomeProduct } from '@/lib/home-data'

function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 34, s: 18 })

  useEffect(() => {
    const end = new Date(endTime).getTime()
    const tick = () => {
      const diff = Math.max(0, end - Date.now())
      setTimeLeft({
        h: Math.floor(diff / (1000 * 60 * 60)),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
      })
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="flex items-center gap-1.5">
      {(['h', 'm', 's'] as const).map((k, i) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center text-xs font-bold font-mono">
            {pad(timeLeft[k])}
          </span>
          {i < 2 && <span className="text-white/60">:</span>}
        </span>
      ))}
    </div>
  )
}

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString('fr-FR')} ${currency}`
}

export default function FlashSaleSection() {
  const [products, setProducts] = useState<HomeProduct[]>(flashSaleProducts)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog/products?limit=12&onlyPrice=true&sortBy=price-desc')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = data?.products || data?.items || []
        if (items.length > 0) {
          const mapped = items.map(mapCatalogToFlashProduct)
          // Only keep products that look like they have a discount
          const withDiscount = mapped.filter((p: HomeProduct) => p.originalPrice && p.originalPrice > p.price)
          setProducts(withDiscount.length >= 4 ? withDiscount.slice(0, 8) : mapped.slice(0, 8))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="py-6 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg">⚡ Vente Flash</h2>
            <CountdownTimer endTime={flashSaleEndTime} />
          </div>
          <Link href="/produits" className="text-sm underline hover:text-white/80 transition">
            Voir tout →
          </Link>
        </div>

        {/* Horizontal scroll products */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 border-t-0 rounded-b-2xl p-4">
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="snap-start flex-shrink-0 w-[160px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="h-[160px] bg-slate-100 animate-pulse" />
                    <div className="p-2.5 space-y-2">
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
                className="snap-start flex-shrink-0 w-[160px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-[160px]">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {p.badges?.map((b) => (
                    <span
                      key={b}
                      className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mb-1.5 min-h-[2rem]">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm font-bold text-red-500">
                      {formatPrice(p.price, p.currency)}
                    </span>
                    {p.originalPrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatPrice(p.originalPrice, p.currency)}
                      </span>
                    )}
                  </div>
                  {/* Stock bar */}
                  {p.stockLeft && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.max(10, (p.stockLeft / 50) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-red-500 font-medium">
                        Plus que {p.stockLeft} !
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
