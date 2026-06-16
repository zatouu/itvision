'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS,
  type SeaFreightEligibilitySettings,
} from '@/lib/shipping/sea-freight-eligibility'

type ShippingMethodId = 'air_express' | 'air_15' | 'sea_freight'

type Overrides = Partial<Record<ShippingMethodId, { rate: number; minimumCharge?: number }>>

type FormState = {
  air_express_rate: number
  air_express_min: number
  air_15_rate: number
  air_15_min: number
  sea_freight_rate: number
  sea_freight_min: number
  minVolumeM3: number
  minBilledWeightKg: number
  minOrderValueFcfa: number
  requireDimensionsOrVolume: boolean
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
          air_15_rate: toNumber(rates?.air_15?.rate, 8500),
          air_15_min: toNumber(rates?.air_15?.minimumCharge, 15000),
          sea_freight_rate: toNumber(rates?.sea_freight?.rate, 180000),
          sea_freight_min: toNumber(rates?.sea_freight?.minimumCharge, 180000),
          minVolumeM3: toNumber(d?.seaFreightEligibility?.minVolumeM3, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minVolumeM3),
          minBilledWeightKg: toNumber(d?.seaFreightEligibility?.minBilledWeightKg, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minBilledWeightKg),
          minOrderValueFcfa: toNumber(d?.seaFreightEligibility?.minOrderValueFcfa, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minOrderValueFcfa),
          requireDimensionsOrVolume:
            typeof d?.seaFreightEligibility?.requireDimensionsOrVolume === 'boolean'
              ? d.seaFreightEligibility.requireDimensionsOrVolume
              : DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.requireDimensionsOrVolume
        })
      })
      .catch(() => {
        setForm({
          air_express_rate: 12000,
          air_express_min: 20000,
          air_15_rate: 8500,
          air_15_min: 15000,
          sea_freight_rate: 180000,
          sea_freight_min: 180000,
          minVolumeM3: DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minVolumeM3,
          minBilledWeightKg: DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minBilledWeightKg,
          minOrderValueFcfa: DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minOrderValueFcfa,
          requireDimensionsOrVolume: DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.requireDimensionsOrVolume
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

  const seaFreightEligibilityPayload: SeaFreightEligibilitySettings | null = useMemo(() => {
    if (!form) return null
    return {
      minVolumeM3: Number(Math.max(0, form.minVolumeM3).toFixed(4)),
      minBilledWeightKg: Number(Math.max(0, form.minBilledWeightKg).toFixed(2)),
      minOrderValueFcfa: Math.round(Math.max(0, form.minOrderValueFcfa)),
      requireDimensionsOrVolume: !!form.requireDimensionsOrVolume,
    }
  }, [form])

  if (!form) return null

  const save = async () => {
    if (!payload || !seaFreightEligibilityPayload) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: payload,
          seaFreightEligibility: seaFreightEligibilityPayload,
        })
      })
      const data = await res.json()
      if (data?.success && data?.rates) {
        const rates = data.rates
        const sea = data.seaFreightEligibility || seaFreightEligibilityPayload
        setForm({
          air_express_rate: toNumber(rates?.air_express?.rate, form.air_express_rate),
          air_express_min: toNumber(rates?.air_express?.minimumCharge, form.air_express_min),
          air_15_rate: toNumber(rates?.air_15?.rate, form.air_15_rate),
          air_15_min: toNumber(rates?.air_15?.minimumCharge, form.air_15_min),
          sea_freight_rate: toNumber(rates?.sea_freight?.rate, form.sea_freight_rate),
          sea_freight_min: toNumber(rates?.sea_freight?.minimumCharge, form.sea_freight_min),
          minVolumeM3: toNumber(sea?.minVolumeM3, form.minVolumeM3),
          minBilledWeightKg: toNumber(sea?.minBilledWeightKg, form.minBilledWeightKg),
          minOrderValueFcfa: toNumber(sea?.minOrderValueFcfa, form.minOrderValueFcfa),
          requireDimensionsOrVolume:
            typeof sea?.requireDimensionsOrVolume === 'boolean'
              ? sea.requireDimensionsOrVolume
              : form.requireDimensionsOrVolume,
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

      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">🚢 Éligibilité maritime (anti-petites commandes)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1 text-xs">
            <div>Volume minimum (m³)</div>
            <input
              type="number"
              min="0"
              step="0.001"
              className="w-full rounded border px-2 py-1"
              value={form.minVolumeM3}
              onChange={e => setForm({ ...form, minVolumeM3: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1 text-xs">
            <div>Poids facturable minimum (kg)</div>
            <input
              type="number"
              min="0"
              step="0.1"
              className="w-full rounded border px-2 py-1"
              value={form.minBilledWeightKg}
              onChange={e => setForm({ ...form, minBilledWeightKg: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1 text-xs">
            <div>Montant minimum commande (FCFA)</div>
            <input
              type="number"
              min="0"
              step="1000"
              className="w-full rounded border px-2 py-1"
              value={form.minOrderValueFcfa}
              onChange={e => setForm({ ...form, minOrderValueFcfa: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs mt-5">
            <input
              type="checkbox"
              checked={form.requireDimensionsOrVolume}
              onChange={e => setForm({ ...form, requireDimensionsOrVolume: e.target.checked })}
            />
            Exiger dimensions ou volume pour autoriser maritime
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
