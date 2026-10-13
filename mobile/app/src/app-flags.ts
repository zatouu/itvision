import { useEffect, useState } from 'react'
import { apiGet } from './api'

/** Interrupteurs produit pilotés depuis l'admin (/api/services/app-config). */
export type AppFlags = {
  onlinePayments: boolean
  ddmBridge: boolean
  creditsUnlock: boolean
  escrow: boolean
}

// Tout fermé par défaut : l'app reste utilisable (espèces) si la configuration n'est pas lisible
const DEFAULT_FLAGS: AppFlags = { onlinePayments: false, ddmBridge: false, creditsUnlock: false, escrow: false }
const TTL_MS = 5 * 60_000

let cache: { value: AppFlags; at: number } | null = null
let inflight: Promise<AppFlags> | null = null

export function fetchAppFlags(): Promise<AppFlags> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.value)
  if (inflight) return inflight
  inflight = apiGet('/api/services/app-config')
    .then((r: any) => {
      const value: AppFlags = {
        onlinePayments: r?.onlinePayments === true,
        ddmBridge: r?.ddmBridge === true,
        creditsUnlock: r?.creditsUnlock === true,
        escrow: r?.escrow === true,
      }
      cache = { value, at: Date.now() }
      return value
    })
    .catch(() => cache?.value || DEFAULT_FLAGS)
    .finally(() => { inflight = null })
  return inflight
}

export function useAppFlags(): AppFlags & { loaded: boolean } {
  const [flags, setFlags] = useState<AppFlags>(cache?.value || DEFAULT_FLAGS)
  const [loaded, setLoaded] = useState(!!cache)
  useEffect(() => {
    let alive = true
    fetchAppFlags().then(f => { if (alive) { setFlags(f); setLoaded(true) } })
    return () => { alive = false }
  }, [])
  return { ...flags, loaded }
}
