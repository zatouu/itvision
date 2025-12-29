'use client'

import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'

export default function PromoBanner() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 py-3 text-sm font-semibold text-emerald-100">
        <Flame className="h-5 w-5 text-orange-400 animate-pulse" />
        <motion.span
          animate={{ x: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Promo import Chine – Livraison rapide • Stock limité • Profitez-en !
        </motion.span>
        <Flame className="h-5 w-5 text-orange-400 animate-pulse" />
      </div>
      
      {/* Effet de défilement lumineux */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  )
}
