'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { formatCurrency } from './types'
import { ShoppingCart } from 'lucide-react'

interface StickyPriceBarProps {
  productName: string
  gallery: string[]
  comboPrice: number
  show: boolean
  onAddToCart: () => void
  onBuyNow: () => void
}

export default function StickyPriceBar({ productName, gallery, comboPrice, show, onAddToCart, onBuyNow }: StickyPriceBarProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-20 md:top-28 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <Image src={gallery[0] || '/placeholder.svg'} alt="" fill className="object-cover" sizes="48px" />
            </div>
            <div className="flex-1 min-w-0 hidden sm:block">
              <p className="font-medium text-sm truncate dark:text-slate-200">{productName}</p>
              <p className="text-emerald-600 font-bold text-sm">{formatCurrency(comboPrice)}</p>
            </div>
            <button
              onClick={onAddToCart}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 border border-orange-300 dark:border-orange-700 text-orange-600 bg-white dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
            >
              + Panier
            </button>
            <button
              onClick={onBuyNow}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" /> Acheter
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
