'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogIn, LogOut, ShoppingBag, User } from 'lucide-react'

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
  const router = useRouter()
  const pathname = usePathname()

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [marketplaceTier, setMarketplaceTier] = useState<string>('standard')

  const TIER_BADGE: Record<string, { label: string; className: string }> = {
    pro: { label: 'Pro', className: 'bg-green-100 text-green-700 border border-green-200' },
    reseller: { label: 'Revendeur', className: 'bg-violet-100 text-violet-700 border border-violet-200' },
    partner: { label: 'Partenaire', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  }

  useEffect(() => {
    let cancelled = false

    async function loadAuthState() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'GET',
          headers: { accept: 'application/json' },
          cache: 'no-store'
        })
        if (cancelled) return
        setIsAuthenticated(res.ok)
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          setMarketplaceTier(data.user?.marketplaceTier || 'standard')
        }
      } catch {
        if (cancelled) return
        setIsAuthenticated(false)
      } finally {
        if (cancelled) return
        setIsLoading(false)
      }
    }

    loadAuthState()
    return () => {
      cancelled = true
    }
  }, [pathname])

  const redirect = pathname || '/market'
  const loginHref = `/login?redirect=${encodeURIComponent(redirect)}`
  const resolvedUnauthHref = unauthHref || loginHref

  const baseClassName =
    variant === 'header'
      ? 'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition'
      : 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition'

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        }
      })
    } finally {
      setIsAuthenticated(false)
      router.refresh()
      onDone?.()
    }
  }

  if (!isLoading && isAuthenticated) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Link
          href={accountHref}
          onClick={() => onDone?.()}
          className={`${baseClassName} border-green-200 bg-white text-green-700 hover:bg-green-50 dark:border-green-900/60 dark:bg-slate-950 dark:text-green-300 dark:hover:bg-green-900/20`}
        >
          <User className="h-4 w-4" />
          Mon compte
          {TIER_BADGE[marketplaceTier] && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TIER_BADGE[marketplaceTier].className}`}>
              {TIER_BADGE[marketplaceTier].label}
            </span>
          )}
        </Link>

        {showLogout ? (
          <button
            type="button"
            onClick={handleLogout}
            className={`${baseClassName} border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800`}
            aria-label="Déconnexion Market"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className={variant === 'header' ? 'hidden 2xl:inline' : ''}>Déconnexion</span>
            <LogOut className="h-4 w-4 opacity-70" />
          </button>
        ) : null}
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
