'use client'

import { useEffect, useMemo, useState } from 'react'

type ShippingMethodId = 'air_express' | 'air_15' | 'sea_freight'

type Overrides = Partial<Record<ShippingMethodId, { rate: number; minimumCharge?: number }>>

type FormState = {
  air_express_rate: number
  air_express_min: number
  air_15_rate: number
  air_15_min: number
  sea_freight_rate: number
  sea_freight_min: number
}

const toNumber = (v: any, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function AdminShippingRates() {
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/shipping-rates')
      .then(r => r.json())
      .then(d => {
        const rates = d?.rates || {}
        setForm({
          air_express_rate: toNumber(rates?.air_express?.rate, 12000),
          air_express_min: toNumber(rates?.air_express?.minimumCharge, 20000),
          air_15_rate: toNumber(rates?.air_15?.rate, 8000),
          air_15_min: toNumber(rates?.air_15?.minimumCharge, 15000),
          sea_freight_rate: toNumber(rates?.sea_freight?.rate, 170000),
          sea_freight_min: toNumber(rates?.sea_freight?.minimumCharge, 170000)
        })
      })
      .catch(() => {
        setForm({
          air_express_rate: 12000,
          air_express_min: 20000,
          air_15_rate: 8000,
          air_15_min: 15000,
          sea_freight_rate: 170000,
          sea_freight_min: 170000
        })
      })
  }, [])

  const payload: Overrides | null = useMemo(() => {
    if (!form) return null
    return {
      air_express: { rate: Math.round(form.air_express_rate), minimumCharge: Math.round(form.air_express_min) },
      air_15: { rate: Math.round(form.air_15_rate), minimumCharge: Math.round(form.air_15_min) },
      sea_freight: { rate: Math.round(form.sea_freight_rate), minimumCharge: Math.round(form.sea_freight_min) }
    }
  }, [form])

  if (!form) return null

  const save = async () => {
    if (!payload) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data?.success && data?.rates) {
        const rates = data.rates
        setForm({
          air_express_rate: toNumber(rates?.air_express?.rate, form.air_express_rate),
          air_express_min: toNumber(rates?.air_express?.minimumCharge, form.air_express_min),
          air_15_rate: toNumber(rates?.air_15?.rate, form.air_15_rate),
          air_15_min: toNumber(rates?.air_15?.minimumCharge, form.air_15_min),
          sea_freight_rate: toNumber(rates?.sea_freight?.rate, form.sea_freight_rate),
          sea_freight_min: toNumber(rates?.sea_freight?.minimumCharge, form.sea_freight_min)
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3">🚚 Tarifs transport (globaux)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700">Express (FCFA/kg)</div>
          <label className="space-y-1 text-xs">
            <div>Tarif</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={form.air_express_rate}
              onChange={e => setForm({ ...form, air_express_rate: Number(e.target.value) })} />
          </label>
          <label className="space-y-1 text-xs">
            <div>Minimum</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={form.air_express_min}
              onChange={e => setForm({ ...form, air_express_min: Number(e.target.value) })} />
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700">Fret aérien (FCFA/kg)</div>
          <label className="space-y-1 text-xs">
            <div>Tarif</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={form.air_15_rate}
              onChange={e => setForm({ ...form, air_15_rate: Number(e.target.value) })} />
          </label>
          <label className="space-y-1 text-xs">
            <div>Minimum</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={form.air_15_min}
              onChange={e => setForm({ ...form, air_15_min: Number(e.target.value) })} />
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700">Maritime (FCFA/m³)</div>
          <label className="space-y-1 text-xs">
            <div>Tarif</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={form.sea_freight_rate}
              onChange={e => setForm({ ...form, sea_freight_rate: Number(e.target.value) })} />
          </label>
          <label className="space-y-1 text-xs">
            <div>Minimum</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={form.sea_freight_min}
              onChange={e => setForm({ ...form, sea_freight_min: Number(e.target.value) })} />
          </label>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={save} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <div className="text-xs text-gray-500">
          Ces tarifs sont utilisés sur le panier, le détail produit, et les calculs côté API.
        </div>
      </div>
    </div>
  )
}
