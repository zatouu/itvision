'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, Users, UserRound, LayoutDashboard, Camera } from 'lucide-react'
import { useMarketAuth } from '@/hooks/useMarketAuth'
import { useSourcingModal } from '@/components/market/storefront/SourcingModalContext'

// Le panier est dans l'en-tête mobile : la place centrale revient à « Trouvez-moi », le service différenciant.
const leftItems = [
  { name: 'Accueil', href: '/market', icon: Home },
  { name: 'Produits', href: '/produits', icon: Package },
]
const rightItemsBase = [
  { name: 'Groupes', href: '/achats-groupes', icon: Users },
  { name: 'Compte', href: '/compte', icon: UserRound },
]

export default function MarketBottomNav() {
  const pathname = usePathname()
  const { isVendor } = useMarketAuth()
  const { open: openSourcing } = useSourcingModal()
  const navRef = useRef<HTMLElement>(null)
  const sourcingRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const nav = navRef.current
    const sourcing = sourcingRef.current
    if (!nav || !sourcing) return
    const updateHeight = () => {
      const bounds = nav.getBoundingClientRect()
      const top = Math.min(bounds.top, sourcing.getBoundingClientRect().top - 4)
      const height = nav.offsetHeight ? Math.ceil(bounds.bottom - top) + 8 : 0
      document.documentElement.style.setProperty('--mkt-bottom-nav-h', `${height}px`)
    }
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(nav, { box: 'border-box' })
    observer.observe(sourcing, { box: 'border-box' })
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--mkt-bottom-nav-h')
    }
  }, [])

  // Vendeur : « Ma boutique » remplace « Groupes » — l'admin boutique est
  // l'action la plus fréquente ; les groupes restent via l'accueil.
  const rightItems = isVendor
    ? rightItemsBase.map((i) => (i.href === '/achats-groupes' ? { name: 'Ma boutique', href: '/espace-vendeur', icon: LayoutDashboard } : i))
    : rightItemsBase

  const isActive = (href: string) => pathname === href || (href === '/market' && pathname === '/') || (href !== '/market' && pathname.startsWith(href + '/'))

  const renderItem = (item: { name: string; href: string; icon: typeof Home }) => {
    const I = item.icon
    const active = isActive(item.href)
    return (
      <Link
        key={item.name}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium transition-colors ${
          active
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
        }`}
      >
        <I className="w-5 h-5" />
        <span>{item.name}</span>
      </Link>
    )
  }

  return (
    <nav ref={navRef} aria-label="Navigation mobile" className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 dark:bg-slate-950/90 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-end justify-around px-2 pt-1.5 pb-1.5">
        {leftItems.map(renderItem)}
        <button
          ref={sourcingRef}
          type="button"
          onClick={() => openSourcing()}
          aria-label="Trouvez-moi un produit en Chine"
          className="-mt-6 flex flex-col items-center gap-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-emerald-600 text-white shadow-lg shadow-violet-600/30 ring-4 ring-white active:scale-95 transition-transform dark:ring-slate-950">
            <Camera className="h-6 w-6" />
          </span>
          <span>Trouvez-moi</span>
        </button>
        {rightItems.map(renderItem)}
      </div>
    </nav>
  )
}
