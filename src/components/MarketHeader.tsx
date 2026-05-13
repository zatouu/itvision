'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, ShoppingBag, Package, Users, Heart,
  Search, Home, ArrowRight
} from 'lucide-react'
import MarketAuthButton from './MarketAuthButton'
import CartIcon from './CartIcon'
import WishlistIcon from './WishlistIcon'
import ThemeToggle from './ThemeToggle'

export default function MarketHeader() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

  const nav = [
    { name: 'Accueil', href: '/market', icon: Home },
    { name: 'Produits', href: '/produits', icon: Package },
    { name: 'Achats groupés', href: '/achats-groupes', icon: Users },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/market" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-violet-600">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            IT Vision <span className="text-green-600">Plus</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {nav.map((item) => {
            const I = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <I className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/produits/favoris"
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            title="Favoris"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <CartIcon />
          <ThemeToggle />
          <MarketAuthButton
            variant="header"
            accountHref="/compte"
            unauthHref="/login?role=client"
            unauthLabel="Mon compte"
            showLogout={false}
          />
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <CartIcon />
          <button
            ref={buttonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div ref={menuRef} className="md:hidden border-t border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-1 px-4 py-3">
            {nav.map((item) => {
              const I = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <I className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}

            <div className="my-2 border-t border-gray-100 dark:border-slate-800" />

            <Link
              href="/produits/favoris"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800"
            >
              <Heart className="h-4 w-4" />
              Favoris
            </Link>

            <div className="flex items-center gap-2 pt-1">
              <ThemeToggle />
              <MarketAuthButton
                variant="default"
                className="flex-1"
                accountHref="/compte"
                unauthHref="/login?role=client"
                unauthLabel="Mon compte"
                showLogout={false}
                onDone={() => setIsMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
