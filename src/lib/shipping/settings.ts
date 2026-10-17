// Serveur uniquement : cacher le require à webpack/next pour éviter le bundling côté client
const _req: any = eval('require')
const fs: any = _req('fs')
const path: any = _req('path')

import { BASE_SHIPPING_RATES, REAL_SHIPPING_COSTS, type ShippingCosts, type ShippingMethodId, type ShippingRate } from '@/lib/logistics'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS,
  sanitizeSeaFreightEligibilitySettings,
  type SeaFreightEligibilitySettings,
} from '@/lib/shipping/sea-freight-eligibility'

const FILE_PATH = path.resolve(process.cwd(), 'data', 'shipping-rates.json')
const SEA_FREIGHT_ELIGIBILITY_FILE_PATH = path.resolve(process.cwd(), 'data', 'sea-freight-eligibility.json')
const ADJUST_FILE_PATH = path.resolve(process.cwd(), 'data', 'shipping-adjust.json')
const INTERNAL_COSTS_FILE_PATH = path.resolve(process.cwd(), 'data', 'shipping-costs.json')

const internalShippingCostSchema = z.object({
  rate: z.number().finite().int().min(0).max(1_000_000_000),
  minimumCharge: z.number().finite().int().min(0).max(1_000_000_000).optional(),
}).strict()

export const internalShippingCostsSchema = z.object({
  air_express: internalShippingCostSchema.optional(),
  air_15: internalShippingCostSchema.optional(),
  sea_freight: internalShippingCostSchema.optional(),
  local_24h: internalShippingCostSchema.optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Au moins un cout transporteur est requis')

export function getConfiguredInternalShippingCosts(filePath = INTERNAL_COSTS_FILE_PATH): ShippingCosts {
  const overrides = fs.existsSync(filePath)
    ? internalShippingCostsSchema.parse(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
    : {}
  return Object.fromEntries((Object.keys(REAL_SHIPPING_COSTS) as ShippingMethodId[]).map(method => [
    method, { ...REAL_SHIPPING_COSTS[method], ...overrides[method] },
  ])) as ShippingCosts
}

export function writeInternalShippingCosts(payload: unknown, filePath = INTERNAL_COSTS_FILE_PATH): ShippingCosts {
  const validated = internalShippingCostsSchema.parse(payload)
  const current = getConfiguredInternalShippingCosts(filePath)
  const updated = Object.fromEntries((Object.keys(current) as ShippingMethodId[]).map(method => [
    method, { ...current[method], ...validated[method] },
  ])) as ShippingCosts
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(temporaryPath, JSON.stringify(updated, null, 2), {
      flag: 'wx', mode: fs.existsSync(filePath) ? fs.statSync(filePath).mode : 0o600,
    })
    fs.renameSync(temporaryPath, filePath)
    return updated
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath)
  }
}

type ShippingRateOverride = {
  rate: number
  minimumCharge?: number
}

export type ShippingRateOverrides = Partial<Record<ShippingMethodId, ShippingRateOverride>>

const DEFAULT_OVERRIDES: ShippingRateOverrides = {
  // Correction demandée:
  // - Express = 12 000 FCFA/kg (min 12000)
  // - Fret aérien = 8 500 FCFA/kg (min 8500)
  // - Maritime = 180 000 FCFA/m³ (min 0 ou proportional)
  air_express: { rate: 12000, minimumCharge: 12000 },
  air_15: { rate: 8500, minimumCharge: 8500 },
  sea_freight: { rate: 180000, minimumCharge: 0 },
  // Livraison locale (boutiques, stock à Dakar) : forfait coursier ≤ 24h
  local_24h: { rate: 1500, minimumCharge: 0 }
}

function ensureFile() {
  const dir = path.dirname(FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_OVERRIDES, null, 2))
}

function ensureSeaFreightEligibilityFile() {
  const dir = path.dirname(SEA_FREIGHT_ELIGIBILITY_FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(SEA_FREIGHT_ELIGIBILITY_FILE_PATH)) {
    fs.writeFileSync(
      SEA_FREIGHT_ELIGIBILITY_FILE_PATH,
      JSON.stringify(DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS, null, 2)
    )
  }
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
    sea_freight: { ...BASE_SHIPPING_RATES.sea_freight },
    local_24h: { ...BASE_SHIPPING_RATES.local_24h }
  }

  ;(Object.keys(merged) as ShippingMethodId[]).forEach((id) => {
    const o = overrides[id]
    if (!o) return
    if (typeof o.rate === 'number' && o.rate > 0) merged[id].rate = o.rate
    if (typeof o.minimumCharge === 'number' && o.minimumCharge >= 0) merged[id].minimumCharge = o.minimumCharge
  })

  return merged
}

export function readSeaFreightEligibilitySettings(): SeaFreightEligibilitySettings {
  try {
    ensureSeaFreightEligibilityFile()
    const raw = fs.readFileSync(SEA_FREIGHT_ELIGIBILITY_FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return sanitizeSeaFreightEligibilitySettings(parsed, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS)
  } catch {
    return DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS
  }
}

export function writeSeaFreightEligibilitySettings(payload: Partial<SeaFreightEligibilitySettings>) {
  ensureSeaFreightEligibilityFile()
  const current = readSeaFreightEligibilitySettings()
  const next = sanitizeSeaFreightEligibilitySettings(payload, current)
  fs.writeFileSync(SEA_FREIGHT_ELIGIBILITY_FILE_PATH, JSON.stringify(next, null, 2))
  return next
}

/** Tolérance d'écart transport estimé / pesée réelle (0 à 0,5) : réglage admin, sinon SHIPPING_ADJUST_TOLERANCE, sinon 10 %. */
export function readShippingAdjustTolerance(): number {
  try {
    if (fs.existsSync(ADJUST_FILE_PATH)) {
      const v = Number(JSON.parse(fs.readFileSync(ADJUST_FILE_PATH, 'utf-8'))?.tolerance)
      if (Number.isFinite(v) && v >= 0 && v <= 0.5) return v
    }
  } catch {}
  const env = Number(process.env.SHIPPING_ADJUST_TOLERANCE)
  return Number.isFinite(env) && env >= 0 && env <= 0.5 ? env : 0.1
}

export function writeShippingAdjustTolerance(value: number): number {
  const v = Math.min(0.5, Math.max(0, Math.round(value * 1000) / 1000))
  const dir = path.dirname(ADJUST_FILE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(ADJUST_FILE_PATH, JSON.stringify({ tolerance: v }, null, 2))
  return v
}
