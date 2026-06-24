'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, ShoppingCart, Users, UserRound } from 'lucide-react'

const items = [
  { name: 'Accueil', href: '/market', icon: Home },
  { name: 'Produits', href: '/produits', icon: Package },
  { name: 'Groupes', href: '/achats-groupes', icon: Users },
  { name: 'Panier', href: '/panier', icon: ShoppingCart },
  { name: 'Compte', href: '/compte', icon: UserRound },
]

export default function MarketBottomNav() {
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('cart:items')
        const items = raw ? JSON.parse(raw) : []
        setCartCount(items.reduce((s: number, i: any) => s + (i.qty || 1), 0))
      } catch {
        setCartCount(0)
      }
    }
    sync()
    window.addEventListener('cart:updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('cart:updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const I = item.icon
          const active = isActive(item.href)
          const isCart = item.href === '/panier'
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
                active
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <I className="w-5 h-5" />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 text-[9px] leading-none bg-emerald-600 text-white px-1 py-0.5 rounded-full shadow">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
