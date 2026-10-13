'use client'

import { useEffect, useState } from 'react'
import type { ServiceFeeTier } from './tiered-service-fees'

type PublicPricingSettings = {
  singleImportServiceFeeRate: number
  serviceFeeTiers?: ServiceFeeTier[]
}

export function usePricingSettings() {
  const [settings, setSettings] = useState<PublicPricingSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setSettings(null)
    setError(null)
    fetch('/api/pricing/settings', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        const rate = data?.defaults?.singleImportServiceFeeRate
        if (!response.ok || !data.success || typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 100) {
          throw new Error('Chargement des tarifs impossible')
        }
        if (!controller.signal.aborted) setSettings({ singleImportServiceFeeRate: rate, serviceFeeTiers: data.defaults.serviceFeeTiers })
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Chargement des tarifs impossible')
      })
    return () => controller.abort()
  }, [revision])

  return { settings, error, reload: () => setRevision(value => value + 1) }
}