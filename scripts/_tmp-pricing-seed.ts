import { initializeSharedPricing } from '@/lib/pricing/shared-settings'
import { DEFAULT_PRICING_SETTINGS } from '@/lib/pricing/settings'
import { SOURCE_CURRENCY_RATES } from '@/lib/pricing/constants'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import mongoose from 'mongoose'
const r = (id: keyof typeof BASE_SHIPPING_RATES) => ({ rate: BASE_SHIPPING_RATES[id].rate, ...(BASE_SHIPPING_RATES[id].minimumCharge != null ? { minimumCharge: BASE_SHIPPING_RATES[id].minimumCharge } : {}) })
initializeSharedPricing({
  defaults: DEFAULT_PRICING_SETTINGS,
  sourceCurrencyRates: SOURCE_CURRENCY_RATES,
  shippingRates: { air_express: r('air_express'), air_15: r('air_15'), sea_freight: r('sea_freight'), local_24h: r('local_24h') },
  seaFreightEligibility: { minVolumeM3: 0.05, minBilledWeightKg: 15, minOrderValueFcfa: 100000, requireDimensionsOrVolume: true },
  adjustTolerance: 0.1,
}).then(s => console.log('pricing v', s.version)).catch(e => { console.error(e); process.exitCode = 1 }).finally(() => mongoose.disconnect())
