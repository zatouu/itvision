'use client'

import { useEffect, useState } from 'react'

function readWishlistCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem('wishlist:items')
    const items = raw ? JSON.parse(raw) : []
    return Array.isArray(items) ? items.length : 0
  } catch {
    return 0
  }
}

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

export default function WishlistCountBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const update = () => setCount(readWishlistCount())

    // 1) Toujours partir de localStorage pour un rendu instantané
    update()

    // 2) Si l'utilisateur est connecté, synchroniser depuis la DB
    ;(async () => {
      try {
        const res = await fetch('/api/favorites', { method: 'GET' })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        const serverIds: string[] = Array.isArray(data?.favorites) ? data.favorites.filter((x: any) => typeof x === 'string') : []

        const localIds = readWishlistIds()
        const merged = Array.from(new Set([...serverIds, ...localIds]))

        // Si on avait des favoris en invité, on les pousse sur le compte
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
        // Ignore (offline / not logged)
      }
    })()

    window.addEventListener('storage', update)
    window.addEventListener('wishlist:updated', update as EventListener)

    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('wishlist:updated', update as EventListener)
    }
  }, [])

  if (!count) return null

  return (
    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
      {count}
    </span>
  )
}
