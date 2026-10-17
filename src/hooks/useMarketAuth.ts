'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export interface MarketAuthState {
  isLoading: boolean
  isAuthenticated: boolean
  userId: string | null
  role: string | null
  marketplaceTier: string
  isVendor: boolean
  /** client entreprise → compte pointe vers /portail-entreprise */
  isEnterprise: boolean
  /** slug de la boutique du vendeur connecté (null si pas vendeur ou boutique introuvable) */
  shopSlug: string | null
  shopStatus: string | null
}

/**
 * État d'authentification marketplace partagé : /api/auth/login puis, pour
 * un VENDOR, /api/vendor/shop (slug vitrine). Un seul endroit connaît le
 * contrat des deux APIs — header, bottom nav et bouton compte s'y branchent.
 */
export function useMarketAuth(): MarketAuthState {
  const pathname = usePathname()
  const [state, setState] = useState<MarketAuthState>({
    isLoading: true,
    isAuthenticated: false,
    userId: null,
    role: null,
    marketplaceTier: 'standard',
    isVendor: false,
    isEnterprise: false,
    shopSlug: null,
    shopStatus: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/auth/login', {
          headers: { accept: 'application/json' },
          cache: 'no-store',
        })
        if (cancelled) return
        // res.ok est vrai même pour { user: null } — l'auth réelle = user non null
        const data = res.ok ? await res.json().catch(() => ({})) : {}
        const user = data?.user
        if (!user) {
          if (!cancelled) setState((s) => ({ ...s, isLoading: false }))
          return
        }

        const isVendor = user.role === 'VENDOR'
        let shopSlug: string | null = null
        let shopStatus: string | null = null
        if (isVendor) {
          try {
            const sr = await fetch('/api/vendor/shop', { headers: { accept: 'application/json' }, cache: 'no-store' })
            const sd = sr.ok ? await sr.json().catch(() => ({})) : {}
            shopSlug = sd?.shop?.slug ?? null
            shopStatus = sd?.shop?.status ?? null
          } catch {
            // Pas de boutique résolue — le vendeur reste reconnu par son rôle
          }
        }
        if (cancelled) return
        setState({
          isLoading: false,
          isAuthenticated: true,
          userId: user.id ?? null,
          role: user.role ?? null,
          marketplaceTier: user.marketplaceTier || 'standard',
          isVendor,
          isEnterprise: user.clientType === 'enterprise' || !!user.companyClientId,
          shopSlug,
          shopStatus,
        })
      } catch {
        if (!cancelled) setState((s) => ({ ...s, isLoading: false }))
      }
    }

    load()
    return () => { cancelled = true }
  }, [pathname])

  return state
}
