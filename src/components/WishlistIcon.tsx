'use client'

import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

function readWishlistIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('wishlist:items')
    const items = raw ? JSON.parse(raw) : []
    return Array.isArray(items) ? items.filter((x: any) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeWishlistIds(ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('wishlist:items', JSON.stringify(ids))
  window.dispatchEvent(new CustomEvent('wishlist:updated'))
}

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

    // Sync depuis la DB si connecté (et fusionner les favoris invités)
    ;(async () => {
      try {
        const res = await fetch('/api/favorites', { method: 'GET' })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        const serverIds: string[] = Array.isArray(data?.favorites) ? data.favorites.filter((x: any) => typeof x === 'string') : []
        const localIds = readWishlistIds()
        const merged = Array.from(new Set([...serverIds, ...localIds]))

        // Si on avait des favoris en invité, les pousser sur le compte
        if (merged.length !== serverIds.length) {
          await fetch('/api/favorites', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorites: merged })
          }).catch(() => null)
        }

        writeWishlistIds(merged)
        setCount(merged.length)
      } catch {
        // Ignore
      }
    })()

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
      className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 border border-transparent dark:border-slate-800 hover:text-red-500 hover:shadow transition"
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
