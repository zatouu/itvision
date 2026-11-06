import { calculateBilledWeight } from '@/lib/pricing/volumetric-weight'

export type SeaFreightEligibilitySettings = {
  minVolumeM3: number
  minBilledWeightKg: number
  minOrderValueFcfa: number
  requireDimensionsOrVolume: boolean
}

export type SeaFreightEligibilityMetrics = {
  totalVolumeM3: number
  totalBilledWeightKg: number
  totalOrderValueFcfa: number
  hasDimensionsOrVolumeData: boolean
}

export type SeaFreightEligibilityResult = {
  eligible: boolean
  reasons: string[]
  checks: {
    volumeOk: boolean
    billedWeightOk: boolean
    orderValueOk: boolean
    dataOk: boolean
  }
}

export const DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS: SeaFreightEligibilitySettings = {
  minVolumeM3: 0.05,
  minBilledWeightKg: 15,
  minOrderValueFcfa: 100000,
  requireDimensionsOrVolume: true,
}

const toFiniteNumber = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export function sanitizeSeaFreightEligibilitySettings(
  raw: any,
  fallback: SeaFreightEligibilitySettings = DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS
): SeaFreightEligibilitySettings {
  return {
    minVolumeM3: Number(toFiniteNumber(raw?.minVolumeM3, fallback.minVolumeM3, 0, 100).toFixed(4)),
    minBilledWeightKg: Number(toFiniteNumber(raw?.minBilledWeightKg, fallback.minBilledWeightKg, 0, 100000).toFixed(2)),
    minOrderValueFcfa: Math.round(toFiniteNumber(raw?.minOrderValueFcfa, fallback.minOrderValueFcfa, 0, 10_000_000_000)),
    requireDimensionsOrVolume:
      typeof raw?.requireDimensionsOrVolume === 'boolean'
        ? raw.requireDimensionsOrVolume
        : fallback.requireDimensionsOrVolume,
  }
}

export function evaluateSeaFreightEligibility(
  metrics: SeaFreightEligibilityMetrics,
  settings: SeaFreightEligibilitySettings = DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS
): SeaFreightEligibilityResult {
  const safeMetrics: SeaFreightEligibilityMetrics = {
    totalVolumeM3: toFiniteNumber(metrics?.totalVolumeM3, 0, 0, 100000),
    totalBilledWeightKg: toFiniteNumber(metrics?.totalBilledWeightKg, 0, 0, 100000),
    totalOrderValueFcfa: Math.round(toFiniteNumber(metrics?.totalOrderValueFcfa, 0, 0, 10_000_000_000)),
    hasDimensionsOrVolumeData: Boolean(metrics?.hasDimensionsOrVolumeData),
  }

  const volumeOk = safeMetrics.totalVolumeM3 >= settings.minVolumeM3
  const billedWeightOk = safeMetrics.totalBilledWeightKg >= settings.minBilledWeightKg
  const orderValueOk = safeMetrics.totalOrderValueFcfa >= settings.minOrderValueFcfa
  const dataOk = settings.requireDimensionsOrVolume ? safeMetrics.hasDimensionsOrVolumeData : true

  const eligible = dataOk && orderValueOk && (volumeOk || billedWeightOk)

  const reasons: string[] = []
  if (!dataOk) {
    reasons.push('Dimensions/volume requis pour autoriser le maritime')
  }
  if (!orderValueOk) {
    reasons.push(`Montant minimum requis: ${settings.minOrderValueFcfa.toLocaleString('fr-FR')} FCFA`)
  }
  if (!volumeOk && !billedWeightOk) {
    reasons.push(
      `Seuil minimal: ${settings.minVolumeM3} m³ ou ${settings.minBilledWeightKg} kg facturables`
    )
  }

  return {
    eligible,
    reasons,
    checks: {
      volumeOk,
      billedWeightOk,
      orderValueOk,
      dataOk,
    },
  }
}

/**
 * Construit les métriques d'éligibilité maritime depuis les items du calculateur
 * (volume, dimensions et poids issus de la DB — partagé entre devis et commande).
 */
export function buildSeaFreightMetrics(items: Array<{
  qty?: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
}>, orderValueFcfa: number): SeaFreightEligibilityMetrics {
  let totalVolumeM3 = 0
  let totalBilledWeightKg = 0
  let hasDimensionsOrVolumeData = false

  for (const item of items) {
    const qty = Number(item.qty) > 0 ? Number(item.qty) : 1
    const volume = typeof item.volumeM3 === 'number' && item.volumeM3 > 0 ? item.volumeM3 : 0
    const hasDims =
      typeof item.lengthCm === 'number' && item.lengthCm > 0 &&
      typeof item.widthCm === 'number' && item.widthCm > 0 &&
      typeof item.heightCm === 'number' && item.heightCm > 0

    if (volume > 0 || hasDims) {
      hasDimensionsOrVolumeData = true
    }

    totalVolumeM3 += volume * qty

    const actualWeight = typeof item.weightKg === 'number' && item.weightKg > 0 ? item.weightKg : 0
    const weightInfo = calculateBilledWeight({
      actualWeightKg: actualWeight,
      lengthCm: item.lengthCm,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
    })
    totalBilledWeightKg += weightInfo.billedWeight * qty
  }

  return {
    totalVolumeM3: Number(totalVolumeM3.toFixed(4)),
    totalBilledWeightKg: Number(totalBilledWeightKg.toFixed(2)),
    totalOrderValueFcfa: Math.round(orderValueFcfa || 0),
    hasDimensionsOrVolumeData,
  }
}
