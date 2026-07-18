'use client'

import { MessageCircle, ShoppingCart } from 'lucide-react'
import { formatCurrency } from './types'

interface MobileBottomBarProps {
  comboPrice: number
  onWhatsApp: () => void
  onAddToCart: () => void
  onBuyNow: () => void
}

export default function MobileBottomBar({ comboPrice, onWhatsApp, onAddToCart, onBuyNow }: MobileBottomBarProps) {
  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="hidden sm:block flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-sm font-bold text-emerald-600 truncate">{formatCurrency(comboPrice) || '-'}</p>
        </div>
        <button
          type="button"
          aria-label="Contacter par WhatsApp"
          onClick={onWhatsApp}
          className="flex flex-col items-center justify-center w-12 h-11 text-emerald-600 border border-emerald-200 dark:border-emerald-900 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        <button
          onClick={onAddToCart}
          className="flex-1 h-11 border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-800 text-orange-600 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
        >
          <ShoppingCart className="w-4 h-4" />Panier
        </button>
        <button
          onClick={onBuyNow}
          className="flex-[1.35] h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm transition shadow-sm flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="w-4 h-4" />Acheter
        </button>
      </div>
    </div>
  )
}
