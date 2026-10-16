 'use client'

import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Save, Settings2, Trash2 } from 'lucide-react'
import { DEFAULT_SINGLE_IMPORT_SERVICE_FEE_RATE } from '@/lib/pricing/tiered-service-fees'
import { pricingDefaultsUpdateSchema, validate } from '@/lib/validation'

type ServiceFeeTierSetting = {
  minAmount: number
  maxAmount?: number
  feeRate: number
  label: string
  description: string
}

type PricingDefaultsState = {
  defaultExchangeRate: number
  defaultServiceFeeRate: number
  singleImportServiceFeeRate: number
  defaultInsuranceRate: number
  defaultB2BDiscountPercent: number
  serviceFeeTiers: ServiceFeeTierSetting[]
}

const DEFAULT_TIER_SETTINGS: ServiceFeeTierSetting[] = [
  { minAmount: 0, maxAmount: 500000, feeRate: 10, label: 'Standard', description: 'Frais standard' },
  { minAmount: 500000, maxAmount: 2000000, feeRate: 8, label: 'Volume', description: 'Réduction volume' },
  { minAmount: 2000000, maxAmount: 5000000, feeRate: 6, label: 'Pro', description: 'Tarif professionnel' },
  { minAmount: 5000000, feeRate: 5, label: 'Entreprise', description: 'Tarif entreprise' },
]

export default function AdminPricingDefaults() {
  const [defaults, setDefaults] = useState<PricingDefaultsState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [reloadCount, setReloadCount] = useState(0)
  const [canWrite, setCanWrite] = useState(false)
  const [pricingVersion, setPricingVersion] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok || !data.success || !data.defaults || !Number.isInteger(data.pricingVersion) || data.pricingVersion < 1) throw new Error(data.error || 'Lecture des réglages impossible')
        return data
      })
      .then(d => {
        if (cancelled) return
        const loaded = d?.defaults || {}
        setCanWrite(d.permissions?.canWrite === true)
        setPricingVersion(d.pricingVersion)
        setDefaults({
          defaultExchangeRate: Number(loaded.defaultExchangeRate) || 100,
          defaultServiceFeeRate: loaded.defaultServiceFeeRate ?? 10,
          singleImportServiceFeeRate: loaded.singleImportServiceFeeRate ?? DEFAULT_SINGLE_IMPORT_SERVICE_FEE_RATE,
          defaultInsuranceRate: loaded.defaultInsuranceRate ?? 2.5,
          defaultB2BDiscountPercent: Number(loaded.defaultB2BDiscountPercent) || 15,
          serviceFeeTiers: Array.isArray(loaded.serviceFeeTiers) && loaded.serviceFeeTiers.length > 0
            ? loaded.serviceFeeTiers
            : DEFAULT_TIER_SETTINGS,
        })
      })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Lecture des réglages impossible') })
    return () => { cancelled = true }
  }, [reloadCount])

  if (!defaults) return (
    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm" role={error ? 'alert' : 'status'}>
      <span>{error || 'Chargement des réglages...'}</span>
      {error && <button type="button" onClick={() => setReloadCount(count => count + 1)} className="inline-flex min-h-11 items-center gap-2 rounded border px-3"><RefreshCw size={16} /> Réessayer</button>}
    </div>
  )

  const updateTier = (index: number, patch: Partial<ServiceFeeTierSetting>) => {
    setDefaults((prev) => {
      if (!prev) return prev
      const next = [...prev.serviceFeeTiers]
      next[index] = { ...next[index], ...patch }
      return { ...prev, serviceFeeTiers: next }
    })
  }

  const addTier = () => {
    setDefaults((prev) => {
      if (!prev) return prev
      const last = prev.serviceFeeTiers[prev.serviceFeeTiers.length - 1]
      const nextMin = Math.max(0, Number(last?.minAmount || 0) + 500000)
      return {
        ...prev,
        serviceFeeTiers: [
          ...prev.serviceFeeTiers,
          {
            minAmount: nextMin,
            feeRate: Math.max(0, Number(last?.feeRate ?? 10) - 1),
            label: `Palier ${prev.serviceFeeTiers.length + 1}`,
            description: 'Nouveau palier'
          }
        ]
      }
    })
  }

  const removeTier = (index: number) => {
    setDefaults((prev) => {
      if (!prev || prev.serviceFeeTiers.length <= 1) return prev
      return {
        ...prev,
        serviceFeeTiers: prev.serviceFeeTiers.filter((_, i) => i !== index)
      }
    })
  }

  const save = async () => {
    if (saving || !canWrite || !pricingVersion) return
    setError(null)
    setSaved(false)
    const validated = validate(pricingDefaultsUpdateSchema, defaults)
    if (!validated.success) {
      setError(validated.error)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults: validated.data, pricingVersion })
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.defaults || !Number.isInteger(data.pricingVersion) || data.pricingVersion < 1) throw new Error(data.error || 'Enregistrement impossible')
      setDefaults(data.defaults)
      setPricingVersion(data.pricingVersion)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="mb-6 border-b border-gray-200 py-4 text-gray-900 dark:border-gray-700 dark:text-gray-100 [&_input]:min-w-0 [&_input]:dark:border-gray-600 [&_input]:dark:bg-gray-800 [&_input]:dark:text-gray-100 [&_h4]:dark:text-gray-200" onSubmit={event => { event.preventDefault(); void save() }} onChange={() => setSaved(false)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold mb-3"><Settings2 size={16} /> Réglages globaux de tarification</h3>
      {error && <button type="button" disabled={saving} onClick={() => { setDefaults(null); setPricingVersion(null); setSaved(false); setReloadCount(count => count + 1) }} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded border px-3 text-sm"><RefreshCw size={16} /> Recharger les réglages</button>}
      {!canWrite && <p className="mb-3 text-sm text-gray-600">Lecture seule</p>}
      <fieldset disabled={saving || !canWrite} className="min-w-0" aria-busy={saving}>
      <div className="grid grid-cols-1 items-end sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <label className="space-y-1 text-xs">
          <div>Taux de change (1 ¥ = X FCFA)</div>
          <input type="number" required min="1" step="1" className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm" value={defaults.defaultExchangeRate}
            onChange={e => setDefaults({ ...defaults, defaultExchangeRate: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-xs">
          <div>Frais de service par défaut (%)</div>
          <input type="number" required min="0" max="100" step="0.1" className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm" value={defaults.defaultServiceFeeRate}
            onChange={e => setDefaults({ ...defaults, defaultServiceFeeRate: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-xs">
          <div>Frais minimum pour 1 pièce importée (%)</div>
          <input type="number" required min="0" max="100" step="0.1" className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm" value={Number.isFinite(defaults.singleImportServiceFeeRate) ? defaults.singleImportServiceFeeRate : ''}
            onChange={event => setDefaults({ ...defaults, singleImportServiceFeeRate: event.target.valueAsNumber })} />
        </label>
        <label className="space-y-1 text-xs">
          <div>Assurance par défaut (%)</div>
          <input type="number" required min="0" max="100" step="0.1" className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm" value={defaults.defaultInsuranceRate}
            onChange={e => setDefaults({ ...defaults, defaultInsuranceRate: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-xs">
          <div>Remise B2B par défaut (%)</div>
          <input type="number" required min="1" max="50" step="0.1" className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm" value={defaults.defaultB2BDiscountPercent}
            onChange={e => setDefaults({ ...defaults, defaultB2BDiscountPercent: Number(e.target.value) })} />
        </label>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-xs font-semibold text-gray-700">Paliers frais de service B2B</h4>
          <button
            type="button"
            onClick={addTier}
            disabled={defaults.serviceFeeTiers.length >= 20}
            className="min-h-11 px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus size={14} className="inline-block mr-1" /> Ajouter palier
          </button>
        </div>
        <div className="space-y-2">
          {defaults.serviceFeeTiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
              <label className="col-span-6 lg:col-span-3 min-w-0 text-xs space-y-1">
                <div>Min (FCFA)</div>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  readOnly={index === 0}
                  className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm"
                  value={tier.minAmount}
                  onChange={(e) => updateTier(index, { minAmount: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <label className="col-span-6 lg:col-span-2 min-w-0 text-xs space-y-1">
                <div>Taux (%)</div>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0"
                  max="100"
                  className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm"
                  value={tier.feeRate}
                  onChange={(e) => updateTier(index, { feeRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                />
              </label>
              <label className="col-span-6 lg:col-span-3 min-w-0 text-xs space-y-1">
                <div>Label</div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm"
                  value={tier.label}
                  onChange={(e) => updateTier(index, { label: e.target.value })}
                />
              </label>
              <label className="col-span-6 lg:col-span-3 min-w-0 text-xs space-y-1">
                <div>Description</div>
                <input
                  type="text"
                  maxLength={500}
                  className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm"
                  value={tier.description}
                  onChange={(e) => updateTier(index, { description: e.target.value })}
                />
              </label>
              <div className="col-span-12 lg:col-span-1">
                <button
                  type="button"
                  onClick={() => removeTier(index)}
                  title="Supprimer le palier"
                  aria-label="Supprimer le palier"
                  className="flex min-h-11 w-full items-center justify-center px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                  disabled={index === 0}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3">
        {error && <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {saved && <p role="status" className="mb-2 text-sm text-green-700 dark:text-green-400">Réglages enregistrés.</p>}
        {canWrite && <button type="submit" className="inline-flex min-h-11 items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={saving}><Save size={16} />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      </div>
      </fieldset>
    </form>
  )
}
