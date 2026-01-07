export const DEFAULT_EXCHANGE_RATE = 100 // 1 ¥ = 100 FCFA
export const DEFAULT_SERVICE_FEE_RATE = 10 // 10% de frais de service par défaut
export const DEFAULT_INSURANCE_RATE = 2.5 // 2.5% d'assurance par défaut

export const SERVICE_FEE_RATES = [5, 10, 15] as const

export type ServiceFeeRate = typeof SERVICE_FEE_RATES[number]

export default {
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_SERVICE_FEE_RATE,
  DEFAULT_INSURANCE_RATE,
  SERVICE_FEE_RATES
}
