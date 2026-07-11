'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { showcaseCategories } from '@/lib/home-data'

export default function CategoryShowcase() {
  return (
    <section className="py-8 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6">
          🏬 Découvrez nos rayons
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {showcaseCategories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={cat.href}
                className={`block relative h-[200px] md:h-[280px] rounded-2xl overflow-hidden group bg-gradient-to-t ${cat.color} to-transparent`}
              >
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-bold text-lg md:text-xl">{cat.label}</h3>
                  <p className="text-sm opacity-90">{cat.productCount.toLocaleString('fr-FR')}+ produits</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
