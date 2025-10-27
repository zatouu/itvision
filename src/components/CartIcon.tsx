'use client'

import { ShoppingCart } from 'lucide-react'
import React from 'react'

export default function CartIcon({ count = 0, onClick }: { count?: number; onClick?: () => void }) {
  return (
    <button
      aria-label="Open cart"
      onClick={onClick}
      className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white text-gray-700 hover:text-emerald-600 hover:shadow transition"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shadow">
          {count}
        </span>
      )}
    </button>
  )
}


