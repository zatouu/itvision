'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, X, Package, Users, Heart,
  Home, Store, Truck, Gem,
  BarChart3, LayoutDashboard
} from 'lucide-react'
import MarketAuthButton from './MarketAuthButton'
import { useMarketAuth } from '@/hooks/useMarketAuth'
import CartIcon from './CartIcon'
import NotificationCenter from './NotificationCenter'
import ThemeToggle from './ThemeToggle'
import CategoryMegaMenu from './catalog/CategoryMegaMenu'
import DDMLogo from './branding/DDMLogo'
import SearchAutocomplete from './SearchAutocomplete'
import { useSourcingModal } from './market/storefront/SourcingModalContext'

export default function MarketHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { open: openSourcing } = useSourcingModal()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [compareCount, setCompareCount] = useState(0)
  const [grainsBalance, setGrainsBalance] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => { setIsMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (isMenuOpen) menuRef.current?.querySelector<HTMLElement>('a, button, summary')?.focus()
  }, [isMenuOpen])

  // Hauteur réelle du header exposée en variable CSS : les barres sticky des
  // écrans s'alignent dessous sans constante magique (le header grandit avec
  // la barre de recherche, bannière, etc.).
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const apply = () => {
      document.documentElement.style.setProperty('--mkt-header-h', `${el.offsetHeight}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
    window.addEventListener('compare:updated', syncCartAndCompare)
    window.addEventListener('grains:updated', syncGrains)
    window.addEventListener('storage', syncCartAndCompare)
    return () => {
      window.removeEventListener('cart:updated', syncCartAndCompare)
      window.removeEventListener('compare:updated', syncCartAndCompare)
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
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsMenuOpen(false)
      buttonRef.current?.focus()
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const { isVendor } = useMarketAuth()

  const nav = [
    { name: 'Accueil', href: '/market', icon: Home },
    { name: 'Produits', href: '/produits', icon: Package },
    { name: 'Achats groupés', href: '/achats-groupes', icon: Users },
    { name: 'Boutiques', href: '/market/boutiques', icon: Store },
    // Accès direct à l'admin boutique — le point d'entrée principal du vendeur
    ...(isVendor ? [{ name: 'Ma boutique', href: '/espace-vendeur', icon: LayoutDashboard }] : []),
  ]

  const isActive = (href: string) => pathname === href || (href === '/market' && pathname === '/') || (href !== '/market' && pathname.startsWith(href + '/'))

  const handleSearch = useCallback((term: string) => {
    router.push(`/produits?q=${encodeURIComponent(term)}`)
  }, [router])

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="hidden border-b border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 xl:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-semibold">
          <span>Chine → Sénégal</span>
          <Link href="/suivi" className="flex items-center gap-1.5 hover:underline"><Truck className="h-3.5 w-3.5" /> Suivre une commande</Link>
        </div>
      </div>
      <nav aria-label="Navigation principale" className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <Link href="/market" aria-label="DDM+, accueil" className="flex w-24 min-[360px]:w-32 shrink-0 items-center xl:w-28">
          <DDMLogo variant="horizontal" size="lg" showTagline={false} priority />
        </Link>

        {/* Desktop actions */}
        <div className="hidden xl:flex shrink-0 items-center gap-1">
          <Link
            href="/produits/favoris"
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            title="Favoris"
            aria-label="Favoris"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <NotificationCenter />
          <CartIcon count={cartCount} />
          {compareCount > 0 && (
            <Link
              href="/produits/compare"
              className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              title="Comparer"
              aria-label="Comparer"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 text-[11px] leading-none bg-violet-600 text-white px-1.5 py-0.5 rounded-full shadow">
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
        <div className="flex shrink-0 items-center gap-1 xl:hidden">
          <NotificationCenter />
          <CartIcon count={cartCount} />
          {compareCount > 0 && (
            <Link
              href="/produits/compare"
              className="relative rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              aria-label="Comparer"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 text-[11px] leading-none bg-violet-600 text-white px-1.5 py-0.5 rounded-full shadow">
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
            className="grid h-11 w-11 place-items-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Recherche — action principale du marketplace, visible sur tous les écrans */}
      <div className="border-t border-gray-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
          <nav aria-label="Rayons et services" className="hidden shrink-0 items-center gap-1 xl:flex">
            <CategoryMegaMenu />
            {nav.filter(item => item.href !== '/market').map(item => {
              const ItemIcon = item.icon
              const active = isActive(item.href)
              return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-sm font-medium ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}><ItemIcon size={16} />{item.name}</Link>
            })}
          </nav>
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-gray-200 bg-white py-0.5 transition focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 dark:border-slate-700 dark:bg-slate-900">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              onCameraClick={openSourcing}
              placeholder="Rechercher un produit, une marque, une catégorie…"
            />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div id="mobile-menu" ref={menuRef} aria-label="Menu mobile" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node) && !buttonRef.current?.contains(event.relatedTarget as Node)) setIsMenuOpen(false)
        }} className="absolute inset-x-0 top-full overflow-y-auto overscroll-contain border-b border-t border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 xl:hidden" style={{ maxHeight: 'calc(100dvh - var(--mkt-header-h, 140px) - var(--mkt-bottom-nav-h, 0px))' }}>
          <div className="space-y-1 px-4 py-3">
            <CategoryMegaMenu embedded onNavigate={() => setIsMenuOpen(false)} />
            <div className="my-3 border-t border-gray-100 dark:border-slate-800" />
            {nav.map((item) => {
              const I = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
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
                Comparer <span className="ml-auto text-[11px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{compareCount}</span>
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
