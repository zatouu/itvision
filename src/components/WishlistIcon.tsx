'use client'

import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function WishlistIcon() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const updateCount = () => {
      try {
        const favorites = JSON.parse(localStorage.getItem('wishlist:items') || '[]')
        setCount(favorites.length)
      } catch {
        setCount(0)
      }
    }
    
    updateCount()
    window.addEventListener('wishlist:updated', updateCount)
    window.addEventListener('storage', updateCount)
    
    return () => {
      window.removeEventListener('wishlist:updated', updateCount)
      window.removeEventListener('storage', updateCount)
    }
  }, [])

  return (
    <Link
      href="/produits/favoris"
      className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white text-gray-700 hover:text-red-500 hover:shadow transition"
      aria-label="Voir mes favoris"
    >
      <Heart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none bg-red-500 text-white px-1.5 py-0.5 rounded-full shadow">
          {count}
        </span>
      )}
    </Link>
  )
}
