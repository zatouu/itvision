'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, ShoppingBag, Package, Users, Heart,
  Home, Store, UserRound, Truck, Sparkles, Gem,
  BarChart3, Search
} from 'lucide-react'
import MarketAuthButton from './MarketAuthButton'
import CartIcon from './CartIcon'
import ThemeToggle from './ThemeToggle'
import CategoryMegaMenu from './catalog/CategoryMegaMenu'
import DDMLogo from './branding/DDMLogo'

export default function MarketHeader() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [compareCount, setCompareCount] = useState(0)
  const [grainsBalance, setGrainsBalance] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const syncCartAndCompare = () => {
      try {
        const cartRaw = localStorage.getItem('cart:items')
        const cartItems = cartRaw ? JSON.parse(cartRaw) : []
        setCartCount(cartItems.reduce((s: number, i: any) => s + (i.qty || 1), 0))

        const compareRaw = localStorage.getItem('compare:ids')
        setCompareCount(compareRaw ? compareRaw.split(',').filter(Boolean).length : 0)
      } catch {
        setCartCount(0)
        setCompareCount(0)
      }
    }

    const syncGrains = async () => {
      try {
        const res = await fetch('/api/grains', { credentials: 'include' })
        if (!res.ok) { setGrainsBalance(null); return }
        const data = await res.json()
        if (data?.success && typeof data.user?.balance === 'number') {
          setGrainsBalance(data.user.balance)
        } else {
          setGrainsBalance(null)
        }
      } catch {
        setGrainsBalance(null)
      }
    }

    syncCartAndCompare()
    syncGrains()

    window.addEventListener('cart:updated', syncCartAndCompare)
    window.addEventListener('grains:updated', syncGrains)
    window.addEventListener('storage', syncCartAndCompare)
    return () => {
      window.removeEventListener('cart:updated', syncCartAndCompare)
      window.removeEventListener('grains:updated', syncGrains)
      window.removeEventListener('storage', syncCartAndCompare)
    }
  }, [])

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
    { name: 'Boutiques', href: '/market/boutiques', icon: Store },
    { name: 'Compte', href: '/compte', icon: UserRound },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="hidden border-b border-green-100 bg-gradient-to-r from-green-600 via-emerald-600 to-violet-600 text-white md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Import Chine → Sénégal, achats groupés et futurs shops partenaires
          </div>
          <div className="flex items-center gap-5 text-white/90">
            <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Livraison Dakar & régions</span>
            <span>Support commande</span>
            <span>Contrôle qualité</span>
          </div>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/market" className="flex items-center gap-2 w-28 md:w-40">
          <DDMLogo variant="horizontal" size="md" showTagline={false} priority className="w-full h-auto" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <CategoryMegaMenu />
          <div className="w-px h-6 bg-slate-200 mx-1" />
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
          <CartIcon count={cartCount} />
          {compareCount > 0 && (
            <Link
              href="/produits/compare"
              className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              title="Comparer"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none bg-violet-600 text-white px-1.5 py-0.5 rounded-full shadow">
                {compareCount}
              </span>
            </Link>
          )}
          <Link
            href="/grains"
            className="flex items-center gap-1.5 rounded-lg border border-violet-200/60 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/30 px-2.5 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-100/60 dark:hover:bg-violet-950/50 transition-colors whitespace-nowrap"
            title="Mes Grains"
          >
            <Gem className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">
              {grainsBalance !== null ? grainsBalance.toLocaleString('fr-FR') : '—'} Grains
            </span>
          </Link>
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
          <Link
            href="/produits"
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </Link>
          <CartIcon count={cartCount} />
          {compareCount > 0 && (
            <Link
              href="/produits/compare"
              className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              aria-label="Comparer"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none bg-violet-600 text-white px-1.5 py-0.5 rounded-full shadow">
                {compareCount}
              </span>
            </Link>
          )}
          <button
            ref={buttonRef}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
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
            {compareCount > 0 && (
              <Link
                href="/produits/compare"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800"
              >
                <BarChart3 className="h-4 w-4" />
                Comparer <span className="ml-auto text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{compareCount}</span>
              </Link>
            )}

            <Link
              href="/grains"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
            >
              <Gem className="h-4 w-4" />
              <span>{grainsBalance !== null ? grainsBalance.toLocaleString('fr-FR') : '—'} Grains</span>
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
