'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LayoutDashboard, LogIn, LogOut, Settings, ShoppingBag, Store, User } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'
import { useMarketAuth } from '@/hooks/useMarketAuth'

interface MarketAuthButtonProps {
  className?: string
  variant?: 'default' | 'header'
  onDone?: () => void
  /** If provided, overrides where unauthenticated users are sent (e.g. /market/creer-compte). */
  unauthHref?: string
  /** If provided, overrides the account destination when authenticated. */
  accountHref?: string
  /** Customize label shown when unauthenticated. */
  unauthLabel?: string
  /** Whether to show the logout action when authenticated. */
  showLogout?: boolean
}

export default function MarketAuthButton({
  className = '',
  variant = 'header',
  onDone,
  unauthHref,
  accountHref = '/market/compte',
  unauthLabel = 'Mon compte',
  showLogout = true
}: MarketAuthButtonProps) {
  const pathname = usePathname()
  const auth = useMarketAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const TIER_BADGE: Record<string, { label: string; className: string }> = {
    pro: { label: 'Pro', className: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' },
    reseller: { label: 'Revendeur', className: 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800' },
    partner: { label: 'Partenaire', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800' },
  }

  const redirect = pathname || '/market'
  const loginHref = `/login?redirect=${encodeURIComponent(redirect)}`
  const resolvedUnauthHref = unauthHref || loginHref
  const resolvedAccountHref = auth.isEnterprise ? '/portail-entreprise' : accountHref

  const baseClassName =
    variant === 'header'
      ? 'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition'
      : 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition'

  const itemClass = 'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'

  if (!auth.isLoading && auth.isAuthenticated) {
    return (
      <div className={`relative inline-flex items-center gap-2 ${className}`} ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={`${baseClassName} border-green-200 bg-white text-green-700 hover:bg-green-50 dark:border-green-900/60 dark:bg-slate-950 dark:text-green-300 dark:hover:bg-green-900/20`}
        >
          <User className="h-4 w-4" />
          Mon compte
          {TIER_BADGE[auth.marketplaceTier] && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TIER_BADGE[auth.marketplaceTier].className}`}>
              {TIER_BADGE[auth.marketplaceTier].label}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <Link href={resolvedAccountHref} onClick={() => { setMenuOpen(false); onDone?.() }} className={itemClass} role="menuitem">
              <User className="h-4 w-4 text-slate-400" />
              Mon compte
            </Link>
            {auth.isVendor && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link href="/espace-vendeur" onClick={() => { setMenuOpen(false); onDone?.() }} className={`${itemClass} font-semibold text-green-700 dark:text-green-300`} role="menuitem">
                  <LayoutDashboard className="h-4 w-4" />
                  Tableau de bord boutique
                </Link>
                {auth.shopSlug && (
                  <Link href={`/boutiques/${auth.shopSlug}`} onClick={() => { setMenuOpen(false); onDone?.() }} className={itemClass} role="menuitem">
                    <Store className="h-4 w-4 text-slate-400" />
                    Voir ma vitrine
                  </Link>
                )}
                <Link href="/espace-vendeur/parametres" onClick={() => { setMenuOpen(false); onDone?.() }} className={itemClass} role="menuitem">
                  <Settings className="h-4 w-4 text-slate-400" />
                  Paramètres boutique
                </Link>
              </>
            )}
            {showLogout ? (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <LogoutButton
                  className={itemClass}
                  redirectTo="/market"
                  onDone={() => { setMenuOpen(false); onDone?.() }}
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Déconnexion
                </LogoutButton>
              </>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={resolvedUnauthHref}
      className={`${baseClassName} ${className} border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-emerald-900/20`}
    >
      <ShoppingBag className="h-4 w-4" />
      {unauthLabel}
      <LogIn className="h-4 w-4 opacity-70" />
    </Link>
  )
}
