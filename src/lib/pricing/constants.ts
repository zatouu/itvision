
export const DEFAULT_EXCHANGE_RATE = 100 // 1 ¥ = 100 FCFA
export const DEFAULT_SERVICE_FEE_RATE = 10 // 10% de frais de service par défaut
export const DEFAULT_INSURANCE_RATE = 2.5 // 2.5% d'assurance par défaut

/**
 * Devises sources supportées : CNY (1688), USD/EUR (AliExpress/Alibaba
 * internationaux), MAD/XOF/XAF/GBP/AED/SAR (devises localisées que ces
 * plateformes peuvent servir selon la geo-IP — cookie USD forcé en
 * priorité, détection en fallback).
 */
export const SOURCE_CURRENCIES = ['CNY', 'USD', 'EUR', 'MAD', 'XOF', 'XAF', 'GBP', 'AED', 'SAR'] as const
export type SourceCurrency = typeof SOURCE_CURRENCIES[number]

/**
 * Taux de conversion devise source → FCFA pour le sourcing.
 * EUR/XOF arrimés (655,957). Surcharge via EXCHANGE_RATE_<CODE>.
 */
export const SOURCE_CURRENCY_RATES: Record<string, number> = {
  CNY: Number(process.env.EXCHANGE_RATE_CNY || DEFAULT_EXCHANGE_RATE),
  USD: Number(process.env.EXCHANGE_RATE_USD || 600),
  EUR: Number(process.env.EXCHANGE_RATE_EUR || 656),
  MAD: Number(process.env.EXCHANGE_RATE_MAD || 60),
  XOF: 1,
  XAF: 1,
  GBP: Number(process.env.EXCHANGE_RATE_GBP || 765),
  AED: Number(process.env.EXCHANGE_RATE_AED || 165),
  SAR: Number(process.env.EXCHANGE_RATE_SAR || 160),
}

export function sourceCurrencyRate(currency?: string): number {
  return SOURCE_CURRENCY_RATES[currency || 'CNY'] || DEFAULT_EXCHANGE_RATE
}

/** Prix plancher qualité par devise — en dessous : acompte, accessoire ou listing bidon. */
export const MIN_SOURCE_PRICE: Record<string, number> = {
  CNY: 2, USD: 1, EUR: 1, MAD: 5, XOF: 500, XAF: 500, GBP: 1, AED: 3, SAR: 3,
}

export function minSourcePrice(currency?: string): number {
  return MIN_SOURCE_PRICE[currency || 'CNY'] ?? 1
}

export const SERVICE_FEE_RATES = [5, 10, 15] as const

export type ServiceFeeRate = typeof SERVICE_FEE_RATES[number]

export default {
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_SERVICE_FEE_RATE,
  DEFAULT_INSURANCE_RATE,
  SERVICE_FEE_RATES
}
