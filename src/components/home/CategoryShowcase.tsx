'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface CategoryItem {
  label: string
  slug: string
  color: string
}

const colorPool = [
  'from-pink-500/60',
  'from-violet-500/60',
  'from-orange-500/60',
  'from-blue-500/60',
  'from-slate-700/70',
  'from-emerald-500/60',
  'from-cyan-500/60',
  'from-rose-500/60',
]

export default function CategoryShowcase() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/catalog/categories')
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.success && Array.isArray(data.items)) {
          const items = data.items
            .map((c: any, i: number) => ({
              label: c.labelFr || c.name,
              slug: c.slug,
              color: colorPool[i % colorPool.length],
            }))
            .filter((c: CategoryItem) => c.label)
          setCategories(items.slice(0, 6))
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (!loading && categories.length === 0) return null

  return (
    <section className="py-8 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6">
          🏬 Découvrez nos rayons
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={`/produits?cat=${encodeURIComponent(cat.slug)}`}
                className={`block relative h-[200px] md:h-[280px] rounded-2xl overflow-hidden group bg-gradient-to-t ${cat.color} to-transparent`}
              >
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-bold text-lg md:text-xl">{cat.label}</h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
