'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { REAL_SHIPPING_COSTS, type ShippingCosts } from '@/lib/logistics'
import {
  DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS,
  type SeaFreightEligibilitySettings,
} from '@/lib/shipping/sea-freight-eligibility'

type ShippingMethodId = 'air_express' | 'air_15' | 'sea_freight' | 'local_24h'

type Overrides = Partial<Record<ShippingMethodId, { rate: number; minimumCharge?: number }>>

type FormState = {
  internalCosts: ShippingCosts
  internalCostsVersion: number
  pricingVersion: number
  air_express_rate: number
  air_express_min: number
  air_15_rate: number
  air_15_min: number
  sea_freight_rate: number
  sea_freight_min: number
  local_24h_rate: number
  minVolumeM3: number
  minBilledWeightKg: number
  minOrderValueFcfa: number
  requireDimensionsOrVolume: boolean
  adjustTolerancePct: number
}

const toNumber = (v: any, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function AdminShippingRates() {
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () => {
    setError('')
    return fetch('/api/admin/shipping-rates', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok || !data?.success || !data.rates || !data.internalCosts || !Number.isInteger(data.internalCostsVersion) || data.internalCostsVersion < 1 || !Number.isInteger(data.pricingVersion) || data.pricingVersion < 1) {
          throw new Error(data?.error || 'Lecture des tarifs impossible.')
        }
        return data
      })
      .then(d => {
        const rates = d?.rates || {}
        setForm({
          internalCosts: d.internalCosts,
          internalCostsVersion: d.internalCostsVersion,
          pricingVersion: d.pricingVersion,
          air_express_rate: toNumber(rates?.air_express?.rate, 12000),
          air_express_min: toNumber(rates?.air_express?.minimumCharge, 12000),
          air_15_rate: toNumber(rates?.air_15?.rate, 8500),
          air_15_min: toNumber(rates?.air_15?.minimumCharge, 8500),
          sea_freight_rate: toNumber(rates?.sea_freight?.rate, 180000),
          sea_freight_min: toNumber(rates?.sea_freight?.minimumCharge, 0),
          local_24h_rate: toNumber(rates?.local_24h?.rate, 1500),
          minVolumeM3: toNumber(d?.seaFreightEligibility?.minVolumeM3, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minVolumeM3),
          minBilledWeightKg: toNumber(d?.seaFreightEligibility?.minBilledWeightKg, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minBilledWeightKg),
          minOrderValueFcfa: toNumber(d?.seaFreightEligibility?.minOrderValueFcfa, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.minOrderValueFcfa),
          requireDimensionsOrVolume:
            typeof d?.seaFreightEligibility?.requireDimensionsOrVolume === 'boolean'
              ? d.seaFreightEligibility.requireDimensionsOrVolume
              : DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS.requireDimensionsOrVolume,
          adjustTolerancePct: Math.round(toNumber(d?.adjustTolerance, 0.1) * 100),
        })
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Lecture des tarifs impossible.'))
  }

  useEffect(() => { void load() }, [])

  const payload: Overrides | null = useMemo(() => {
    if (!form) return null
    return {
      air_express: { rate: Math.round(form.air_express_rate), minimumCharge: Math.round(form.air_express_min) },
      air_15: { rate: Math.round(form.air_15_rate), minimumCharge: Math.round(form.air_15_min) },
      sea_freight: { rate: Math.round(form.sea_freight_rate), minimumCharge: Math.round(form.sea_freight_min) },
      local_24h: { rate: Math.round(form.local_24h_rate), minimumCharge: 0 }
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

  if (!form) return (
    <section className="mb-6 py-4 text-gray-900 dark:text-gray-100">
      <h3 className="text-sm font-semibold">Transport</h3>
      {error ? <>
        <p role="alert" className="my-3 text-sm text-red-700 dark:text-red-400">{error}</p>
        <button type="button" onClick={() => { void load() }} className="inline-flex min-h-11 items-center gap-2 rounded border px-3">
          <RefreshCw size={16} /> Réessayer
        </button>
      </> : <p role="status" className="mt-3 text-sm">Chargement des tarifs...</p>}
    </section>
  )

  const save = async () => {
    if (!payload || !seaFreightEligibilityPayload) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/admin/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: payload,
          internalCosts: form.internalCosts,
          internalCostsVersion: form.internalCostsVersion,
          pricingVersion: form.pricingVersion,
          seaFreightEligibility: seaFreightEligibilityPayload,
          adjustTolerance: Math.min(50, Math.max(0, form.adjustTolerancePct)) / 100,
        })
      })
      const data = await res.json()
      if (res.ok && data?.success && data?.rates && data?.internalCosts && Number.isInteger(data.internalCostsVersion) && data.internalCostsVersion > 0 && Number.isInteger(data.pricingVersion) && data.pricingVersion > 0) {
        const rates = data.rates
        const sea = data.seaFreightEligibility || seaFreightEligibilityPayload
        setForm({
          internalCosts: data.internalCosts,
          internalCostsVersion: data.internalCostsVersion,
          pricingVersion: data.pricingVersion,
          air_express_rate: toNumber(rates?.air_express?.rate, form.air_express_rate),
          air_express_min: toNumber(rates?.air_express?.minimumCharge, form.air_express_min),
          air_15_rate: toNumber(rates?.air_15?.rate, form.air_15_rate),
          air_15_min: toNumber(rates?.air_15?.minimumCharge, form.air_15_min),
          sea_freight_rate: toNumber(rates?.sea_freight?.rate, form.sea_freight_rate),
          sea_freight_min: toNumber(rates?.sea_freight?.minimumCharge, form.sea_freight_min),
          local_24h_rate: toNumber(rates?.local_24h?.rate, form.local_24h_rate),
          minVolumeM3: toNumber(sea?.minVolumeM3, form.minVolumeM3),
          minBilledWeightKg: toNumber(sea?.minBilledWeightKg, form.minBilledWeightKg),
          minOrderValueFcfa: toNumber(sea?.minOrderValueFcfa, form.minOrderValueFcfa),
          requireDimensionsOrVolume:
            typeof sea?.requireDimensionsOrVolume === 'boolean'
              ? sea.requireDimensionsOrVolume
              : form.requireDimensionsOrVolume,
          adjustTolerancePct: Math.round(toNumber(data.adjustTolerance, form.adjustTolerancePct / 100) * 100),
        })
        setSaved(true)
      } else throw new Error(data?.error || 'Enregistrement des tarifs impossible.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement des tarifs impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="mb-6 text-gray-900 dark:text-gray-100" onSubmit={event => { event.preventDefault(); void save() }}>
      <fieldset disabled={saving} className="min-w-0 space-y-4 disabled:opacity-70 [&_input:not([type=checkbox])]:min-h-11 [&_input:not([type=checkbox])]:min-w-0 [&_input]:dark:border-gray-600 [&_input]:dark:bg-gray-800 [&_input]:dark:text-gray-100">
      <section className="border-b border-gray-200 py-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold">Coûts transporteur</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {([
            { id: 'air_15', label: 'Normal 10-15 jours', unit: 'FCFA/kg' },
            { id: 'air_express', label: 'Express 3-5 jours', unit: 'FCFA/kg' },
            { id: 'sea_freight', label: 'Maritime', unit: 'FCFA/m³' },
          ] as const).map(method => (
            <div key={method.id} className="min-w-0 space-y-2">
              <label className="block space-y-1 text-sm">
                <span>{method.label} - coût ({method.unit})</span>
                <input type="number" min="0" max="1000000000" step="1" required
                  className="w-full rounded border px-3 py-2"
                  value={form.internalCosts[method.id].rate}
                  onChange={event => { setSaved(false); setForm({ ...form, internalCosts: { ...form.internalCosts, [method.id]: { ...form.internalCosts[method.id], rate: Number(event.target.value) } } }) }} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{method.label} - minimum transporteur (FCFA)</span>
                <input type="number" min="0" max="1000000000" step="1" required
                  className="w-full rounded border px-3 py-2"
                  value={form.internalCosts[method.id].minimumCharge ?? REAL_SHIPPING_COSTS[method.id].minimumCharge ?? 0}
                  onChange={event => { setSaved(false); setForm({ ...form, internalCosts: { ...form.internalCosts, [method.id]: { ...form.internalCosts[method.id], minimumCharge: Number(event.target.value) } } }) }} />
              </label>
            </div>
          ))}
        </div>
      </section>
      <h3 className="text-sm font-semibold mb-3">Transport facturé au client</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Express (FCFA/kg)</div>
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
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fret aérien (FCFA/kg)</div>
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
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Maritime (FCFA/m³)</div>
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

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Livraison locale ≤24h (forfait FCFA / boutique)</div>
          <label className="space-y-1 text-xs">
            <div>Forfait par défaut</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={form.local_24h_rate}
              onChange={e => setForm({ ...form, local_24h_rate: Number(e.target.value) })} />
          </label>
          <div className="text-[11px] text-gray-600 dark:text-gray-400">Produits boutique en stock à Dakar — un forfait par boutique, sauf si le vendeur a réglé son propre tarif dans ses paramètres.</div>
        </div>
      </div>

      <div className="border-t border-gray-200 py-4 dark:border-gray-700">
        <h4 className="text-sm font-semibold mb-3">Éligibilité maritime</h4>
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

      <div className="border-t border-gray-200 py-4 dark:border-gray-700">
        <h4 className="text-sm font-semibold mb-1">Ajustement au poids réel (pesée à Guangzhou)</h4>
        <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
          Écart toléré entre le transport payé à la commande et le transport réel : dans la tolérance, rien ne change ; au-delà, seul le dépassement est facturé au client (ou remboursé). Les nouvelles commandes conservent cette tolérance jusqu&apos;à la pesée.
        </p>
        <label className="flex items-center gap-2 text-xs">
          <span>Tolérance</span>
          <input
            type="number"
            min="0"
            max="50"
            step="1"
            className="w-20 rounded border px-2 py-1"
            value={form.adjustTolerancePct}
            onChange={e => setForm({ ...form, adjustTolerancePct: Number(e.target.value) })}
          />
          <span>% (0 à 50)</span>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded" disabled={saving}>
          <Save size={16} />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {saved && <p role="status" className="text-sm text-green-700 dark:text-green-400">Tarifs enregistrés.</p>}
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        {error && <button type="button" onClick={() => { setForm(null); setSaved(false); void load() }} className="inline-flex min-h-11 items-center gap-2 rounded border px-3">
          <RefreshCw size={16} /> Recharger les tarifs
        </button>}
      </div>
      </fieldset>
    </form>
  )
}
