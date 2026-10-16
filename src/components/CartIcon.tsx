'use client'

import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export default function CartIcon({ count = 0, onClick }: { count?: number; onClick?: () => void }) {
  const className = "relative inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:text-emerald-600 hover:shadow transition"
  const badge = count > 0 && (
    <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shadow">
      {count}
    </span>
  )
  if (onClick) {
    return (
      <button aria-label="Ouvrir le panier" onClick={onClick} className={className}>
        <ShoppingCart className="h-5 w-5" />
        {badge}
      </button>
    )
  }
  return (
    <Link href="/panier" aria-label="Voir mon panier" className={className}>
      <ShoppingCart className="h-5 w-5" />
      {badge}
    </Link>
  )
}


