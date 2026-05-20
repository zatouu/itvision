 'use client'

import { useEffect, useState } from 'react'

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

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const loaded = d?.defaults || {}
        setDefaults({
          defaultExchangeRate: Number(loaded.defaultExchangeRate) || 100,
          defaultServiceFeeRate: Number(loaded.defaultServiceFeeRate) || 10,
          defaultInsuranceRate: Number(loaded.defaultInsuranceRate) || 2.5,
          defaultB2BDiscountPercent: Number(loaded.defaultB2BDiscountPercent) || 15,
          serviceFeeTiers: Array.isArray(loaded.serviceFeeTiers) && loaded.serviceFeeTiers.length > 0
            ? loaded.serviceFeeTiers
            : DEFAULT_TIER_SETTINGS,
        })
      })
      .catch(() => setDefaults({
        defaultExchangeRate: 100,
        defaultServiceFeeRate: 10,
        defaultInsuranceRate: 2.5,
        defaultB2BDiscountPercent: 15,
        serviceFeeTiers: DEFAULT_TIER_SETTINGS,
      }))
  }, [])

  if (!defaults) return null

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
            feeRate: Math.max(0, Number(last?.feeRate || 10) - 1),
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
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults)
      })
      const data = await res.json()
      if (data.success) setDefaults(data.defaults)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3">⚙️ Réglages globaux de pricing</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="space-y-1 text-xs">
          <div>Taux de change (1 ¥ = X FCFA)</div>
          <input type="number" className="w-full rounded border px-2 py-1" value={defaults.defaultExchangeRate}
            onChange={e => setDefaults({ ...defaults, defaultExchangeRate: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-xs">
          <div>Frais de service par défaut (%)</div>
          <input type="number" className="w-full rounded border px-2 py-1" value={defaults.defaultServiceFeeRate}
            onChange={e => setDefaults({ ...defaults, defaultServiceFeeRate: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-xs">
          <div>Assurance par défaut (%)</div>
          <input type="number" step="0.1" className="w-full rounded border px-2 py-1" value={defaults.defaultInsuranceRate}
            onChange={e => setDefaults({ ...defaults, defaultInsuranceRate: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-xs">
          <div>Remise B2B par défaut (%)</div>
          <input type="number" className="w-full rounded border px-2 py-1" value={defaults.defaultB2BDiscountPercent}
            onChange={e => setDefaults({ ...defaults, defaultB2BDiscountPercent: Number(e.target.value) })} />
        </label>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-700">Paliers frais de service B2B</h4>
          <button
            type="button"
            onClick={addTier}
            className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
          >
            + Ajouter palier
          </button>
        </div>
        <div className="space-y-2">
          {defaults.serviceFeeTiers.map((tier, index) => (
            <div key={`${tier.label}-${index}`} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
              <label className="col-span-3 text-xs space-y-1">
                <div>Min (FCFA)</div>
                <input
                  type="number"
                  className="w-full rounded border px-2 py-1"
                  value={tier.minAmount}
                  onChange={(e) => updateTier(index, { minAmount: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <label className="col-span-2 text-xs space-y-1">
                <div>Taux (%)</div>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded border px-2 py-1"
                  value={tier.feeRate}
                  onChange={(e) => updateTier(index, { feeRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                />
              </label>
              <label className="col-span-3 text-xs space-y-1">
                <div>Label</div>
                <input
                  type="text"
                  className="w-full rounded border px-2 py-1"
                  value={tier.label}
                  onChange={(e) => updateTier(index, { label: e.target.value })}
                />
              </label>
              <label className="col-span-3 text-xs space-y-1">
                <div>Description</div>
                <input
                  type="text"
                  className="w-full rounded border px-2 py-1"
                  value={tier.description}
                  onChange={(e) => updateTier(index, { description: e.target.value })}
                />
              </label>
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => removeTier(index)}
                  className="w-full px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                  disabled={defaults.serviceFeeTiers.length <= 1}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </div>
  )
}
