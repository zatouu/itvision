import { DEFAULT_EXCHANGE_RATE } from './constants'
import { DEFAULT_SINGLE_IMPORT_SERVICE_FEE_RATE } from './tiered-service-fees'

const KEY = '__ddmPlatformExchangeRate'

/**
 * Taux CNY → FCFA de la plateforme (réglage admin « taux par défaut »), appliqué aux
 * produits sans taux propre — affichage, devis et commande lisent cette même valeur.
 * Module sûr côté client : le réglage est enregistré côté serveur par `pricing/settings`.
 */
export function getPlatformExchangeRate(): number {
  const getter = (globalThis as any)[KEY] as (() => number) | undefined
  const rate = getter ? Number(getter()) : NaN
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_EXCHANGE_RATE
}

export function registerPlatformExchangeRate(getter: () => number): void {
  ;(globalThis as any)[KEY] = getter
}

type PricingRuntime = typeof globalThis & { __ddmSingleImportServiceFeeRate?: () => number }

export function getPlatformSingleImportServiceFeeRate(): number {
  const rate = (globalThis as PricingRuntime).__ddmSingleImportServiceFeeRate?.()
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 100
    ? rate
    : DEFAULT_SINGLE_IMPORT_SERVICE_FEE_RATE
}

export function registerPlatformSingleImportServiceFeeRate(getter: () => number): void {
  ;(globalThis as PricingRuntime).__ddmSingleImportServiceFeeRate = getter
}
