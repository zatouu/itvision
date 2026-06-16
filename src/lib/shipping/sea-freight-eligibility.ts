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
