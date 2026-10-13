import { configuredShippingRates, type SharedPricingConfig } from '@/lib/pricing/shared-settings'
import type { ShippingMethodId } from '@/lib/logistics'
import { VOLUMETRIC_DIVISOR } from '@/lib/pricing/volumetric-weight'

/** Modes clients (commandes, achats groupés) → tarif interne */
export const METHOD_TO_RATE: Record<string, ShippingMethodId> = {
  express_3j: 'air_express',
  air_15j: 'air_15',
  maritime_60j: 'sea_freight',
  air_express: 'air_express',
  air_15: 'air_15',
  sea_freight: 'sea_freight',
}

const SEA_KG_PER_M3 = 1000

/**
 * Écart toléré entre transport estimé et transport réel (pesée à Guangzhou) :
 * dans la fourchette, rien ne change ; au-delà, seul le dépassement est facturé ou remboursé.
 * Réglable dans l'admin (Tarifs transport).
 */
export function shippingTolerance(config: SharedPricingConfig): number {
  return config.adjustTolerance
}

/**
 * Coût du fret international, mêmes règles que le panier :
 * avion = poids facturable max(réel, volumétrique L×l×h/5000) × tarif/kg ;
 * maritime groupage = max(volume, poids/1000) × tarif/m³ (1 t = 1 m³, donc 10 kg = 0,01 m³).
 */
export function freightCost(method: string, measure: { weightKg: number; volumeM3?: number }, config: SharedPricingConfig): { cost: number; billed: number; unit: 'kg' | 'm3' } | null {
  const rateId = METHOD_TO_RATE[method]
  const rate = rateId ? configuredShippingRates(config)[rateId] : null
  if (!rate) return null
  const weight = Math.max(0, measure.weightKg || 0)
  const volume = Math.max(0, measure.volumeM3 || 0)
  if (rate.billing === 'per_cubic_meter') {
    const billed = Math.max(volume, weight / SEA_KG_PER_M3)
    return { cost: Math.round(Math.max(billed * rate.rate, rate.minimumCharge || 0)), billed: Number(billed.toFixed(4)), unit: 'm3' }
  }
  const volumetric = (volume * 1_000_000) / VOLUMETRIC_DIVISOR
  const billed = Math.max(weight, volumetric)
  return { cost: Math.round(Math.max(billed * rate.rate, rate.minimumCharge || 0)), billed: Number(billed.toFixed(2)), unit: 'kg' }
}

/** Écart à régulariser : > 0 = complément dû par le client, < 0 = remboursement, 0 = dans la tolérance. */
export function shippingAdjustment(estimated: number, real: number, tolerance = 0.1): number {
  const high = estimated * (1 + tolerance)
  const low = estimated * (1 - tolerance)
  if (real > high) return Math.round(real - high)
  if (real < low) return -Math.round(low - real)
  return 0
}
