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
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2">
        <a
          href="#" // WhatsApp link handled by parent
          onClick={e => { e.preventDefault(); onWhatsApp() }}
          className="flex flex-col items-center justify-center w-14 h-12 text-emerald-600 border border-emerald-200 rounded-lg"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
        <button
          onClick={onAddToCart}
          className="flex-1 h-12 border-2 border-orange-400 text-orange-600 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition"
        >
          <ShoppingCart className="w-4 h-4" />Panier
        </button>
        <button
          onClick={onBuyNow}
          className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm transition"
        >
          {formatCurrency(comboPrice) || 'Acheter'}
        </button>
      </div>
    </div>
  )
}
