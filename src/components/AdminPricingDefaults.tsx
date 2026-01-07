"use client"

import { useEffect, useState } from 'react'

export default function AdminPricingDefaults() {
  const [defaults, setDefaults] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => setDefaults(d.defaults || {}))
      .catch(() => setDefaults({ defaultExchangeRate: 100, defaultServiceFeeRate: 10, defaultInsuranceRate: 2.5 }))
  }, [])

  if (!defaults) return null

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
      </div>
      <div className="mt-3">
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </div>
  )
}
