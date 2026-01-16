// Serveur uniquement : cacher le require à webpack/next pour éviter le bundling côté client
const _req: any = eval('require')
const fs: any = _req('fs')
const path: any = _req('path')

import { BASE_SHIPPING_RATES, type ShippingMethodId, type ShippingRate } from '@/lib/logistics'

const FILE_PATH = path.resolve(process.cwd(), 'data', 'shipping-rates.json')

type ShippingRateOverride = {
  rate: number
  minimumCharge?: number
}

export type ShippingRateOverrides = Partial<Record<ShippingMethodId, ShippingRateOverride>>

const DEFAULT_OVERRIDES: ShippingRateOverrides = {
  // Correction demandée:
  // - Express = 12 000 FCFA/kg
  // - Fret aérien = 8 000 FCFA/kg
  air_express: { rate: 12000, minimumCharge: 20000 },
  air_15: { rate: 8000, minimumCharge: 15000 },
  // Maritime = 170 000 FCFA/m³ (par défaut)
  sea_freight: { rate: 170000, minimumCharge: 170000 }
}

function ensureFile() {
  const dir = path.dirname(FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_OVERRIDES, null, 2))
}

export function readShippingRateOverrides(): ShippingRateOverrides {
  try {
    ensureFile()
    const raw = fs.readFileSync(FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_OVERRIDES, ...(parsed || {}) }
  } catch {
    return DEFAULT_OVERRIDES
  }
}

export function writeShippingRateOverrides(payload: ShippingRateOverrides) {
  ensureFile()
  const current = readShippingRateOverrides()
  const next: ShippingRateOverrides = { ...current }

  for (const key of Object.keys(payload || {})) {
    const methodId = key as ShippingMethodId
    const v: any = (payload as any)[methodId]
    if (!v || typeof v !== 'object') continue

    const allowed: ShippingRateOverride = {
      rate: typeof v.rate === 'number' && v.rate > 0 ? Math.round(v.rate) : (current[methodId]?.rate ?? BASE_SHIPPING_RATES[methodId].rate)
    }

    if (typeof v.minimumCharge === 'number' && v.minimumCharge >= 0) {
      allowed.minimumCharge = Math.round(v.minimumCharge)
    }

    ;(next as any)[methodId] = allowed
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(next, null, 2))
  return next
}

export function getConfiguredShippingRates(): Record<ShippingMethodId, ShippingRate> {
  const overrides = readShippingRateOverrides()
  const merged: Record<ShippingMethodId, ShippingRate> = {
    air_express: { ...BASE_SHIPPING_RATES.air_express },
    air_15: { ...BASE_SHIPPING_RATES.air_15 },
    sea_freight: { ...BASE_SHIPPING_RATES.sea_freight }
  }

  ;(Object.keys(merged) as ShippingMethodId[]).forEach((id) => {
    const o = overrides[id]
    if (!o) return
    if (typeof o.rate === 'number' && o.rate > 0) merged[id].rate = o.rate
    if (typeof o.minimumCharge === 'number' && o.minimumCharge >= 0) merged[id].minimumCharge = o.minimumCharge
  })

  return merged
}
