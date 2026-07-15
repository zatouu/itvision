'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface CatalogProduct {
  id: string
  name: string
  image: string
  category?: string
}

export default function HeroProductGrid() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [visibleBatch, setVisibleBatch] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog/products?limit=12&segment=import&sortBy=default', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      const items: CatalogProduct[] = (data.products || data.items || data.data || [])
        .slice(0, 12)
        .map((p: any) => ({
          id: p.id || p._id,
          name: p.name || 'Produit',
          image: p.image || '/placeholder.svg',
          category: p.category || '',
        }))
        .filter((p: CatalogProduct) => p.image && p.image !== '/placeholder.svg')
      setProducts(items)
    } catch {
      // Silencieux en cas d'erreur — le fallback gradient reste
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Auto-rotate visible batch every 5 seconds
  useEffect(() => {
    if (products.length < 5) return
    const interval = setInterval(() => {
      setVisibleBatch((prev) => (prev + 1) % Math.ceil(products.length / 4))
    }, 5000)
    return () => clearInterval(interval)
  }, [products.length])

  const visible = products.slice(visibleBatch * 4, visibleBatch * 4 + 4)

  if (loading || visible.length === 0) {
    return (
      <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl">
        <div className="w-full h-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 grid grid-cols-2 grid-rows-2 gap-1 p-1">
          <div className="rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400" />
          <div className="rounded-2xl bg-gradient-to-br from-emerald-200 to-emerald-300" />
          <div className="rounded-2xl bg-gradient-to-br from-violet-200 to-violet-300" />
          <div className="rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={visibleBatch}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="grid grid-cols-2 grid-rows-2 gap-1 p-1 h-full"
        >
          {visible.map((product, i) => (
            <motion.div
              key={product.id + visibleBatch}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-2xl overflow-hidden group"
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, 250px"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-bold truncate drop-shadow-md">
                  {product.name}
                </p>
                {product.category && (
                  <p className="text-white/80 text-[10px] truncate drop-shadow-md">
                    {product.category}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
