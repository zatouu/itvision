'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'

const items = [
  { label: 'Prix usine garanti' },
  { label: 'Transport maritime/aérien inclus' },
  { label: 'Dédouanement géré' },
  { label: 'Livraison Sénégal incluse' },
]

export default function PricingTransparencyBanner() {
  return (
    <section className="py-16 bg-gradient-to-r from-emerald-50 via-white to-violet-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-3">
            💎 Prix clairs, sans frais cachés
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Tout est inclus dans le prix annoncé. Pas de surprise à la livraison.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
            >
              <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="font-semibold text-slate-700">{item.label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-8"
        >
          <Link
            href="#"
            className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 font-semibold text-sm transition-colors"
          >
            Voir le détail de notre tarification
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
