import type { IProduct } from './models/Product.validated'

export type ShippingMethodId = 'air_15' | 'air_express' | 'sea_freight'

export interface ShippingRate {
  id: ShippingMethodId
  label: string
  description: string
  durationDays: number
  billing: 'per_kg' | 'per_cubic_meter'
  rate: number
  minimumCharge?: number
}

export interface ShippingOptionPricing {
  id: ShippingMethodId
  label: string
  description: string
  durationDays: number
  cost: number
  total: number
  currency: string
}

export interface ProductPricingSummary {
  baseCost: number | null
  marginRate: number
  salePrice: number | null
  currency: string
  shippingOptions: ShippingOptionPricing[]
  availabilityLabel: string
  availabilitySubLabel?: string
}

// Taux de transport réels (coûts internes)
export const REAL_SHIPPING_COSTS: Record<ShippingMethodId, { rate: number; minimumCharge?: number }> = {
  air_express: {
    rate: 11000, // 11 000 CFA/kg (coût réel)
    minimumCharge: 25000
  },
  air_15: {
    rate: 7500, // 7 500 CFA/kg (coût réel)
    minimumCharge: 18000
  },
  sea_freight: {
    rate: 135000, // 135 000 CFA/m³ (coût réel)
    minimumCharge: 135000
  }
}

// Taux de transport déclarés aux clients (prix facturé)
export const BASE_SHIPPING_RATES: Record<ShippingMethodId, ShippingRate> = {
  air_express: {
    id: 'air_express',
    label: 'Express aérien 3 jours',
    description: 'Livraison express porte-à-porte en 72h en moyenne',
    durationDays: 3,
    billing: 'per_kg',
    rate: 12000, // 12 000 CFA/kg (prix déclaré client)
    minimumCharge: 25000
  },
  air_15: {
    id: 'air_15',
    label: 'Fret aérien 6-10 jours',
    description: 'Acheminement économique depuis la Chine sous 6-10 jours ouvrés',
    durationDays: 8,
    billing: 'per_kg',
    rate: 8000, // 8 000 CFA/kg (prix déclaré client)
    minimumCharge: 18000
  },
  sea_freight: {
    id: 'sea_freight',
    label: 'Fret maritime 50-60 jours',
    description: 'Groupage maritime économique via container consolidé',
    durationDays: 55,
    billing: 'per_cubic_meter',
    rate: 145000, // 145 000 CFA/m³ (prix déclaré client)
    minimumCharge: 145000
  }
}

const DEFAULT_CURRENCY = 'FCFA'

const roundCurrency = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.round(value)
}

const computeVolume = (product: Partial<IProduct>): number | undefined => {
  if (product.volumeM3 && product.volumeM3 > 0) return product.volumeM3
  if (product.lengthCm && product.widthCm && product.heightCm) {
    const volume = (product.lengthCm * product.widthCm * product.heightCm) / 1_000_000
    return Number.isFinite(volume) ? Number(volume.toFixed(4)) : undefined
  }
  return undefined
}

const resolveOverrideRate = (
  overrides: IProduct['shippingOverrides'] | undefined,
  methodId: ShippingMethodId,
  key: 'ratePerKg' | 'ratePerM3' | 'flatFee'
) => {
  if (!overrides || overrides.length === 0) return undefined
  const override = overrides.find((item) => item.methodId === methodId)
  if (!override) return undefined
  return override[key === 'ratePerKg' ? 'ratePerKg' : key === 'ratePerM3' ? 'ratePerM3' : 'flatFee']
}

export const computeProductPricing = (product: Partial<IProduct>): ProductPricingSummary => {
  const currency = product.currency || DEFAULT_CURRENCY
  const baseCost = typeof product.baseCost === 'number' ? product.baseCost : null
  const marginRate = typeof product.marginRate === 'number' ? product.marginRate : 25

  const salePrice = baseCost !== null
    ? roundCurrency(baseCost * (1 + marginRate / 100))
    : (typeof product.price === 'number' ? roundCurrency(product.price) : null)

  const weightKg = typeof product.weightKg === 'number' ? product.weightKg : undefined
  const volumeM3 = computeVolume(product)
  const overrides = product.shippingOverrides
  const isInStock = product.stockStatus === 'in_stock'

  const shippingOptions: ShippingOptionPricing[] = isInStock
    ? []
    : Object.values(BASE_SHIPPING_RATES)
    .map((method) => {
      let billedAmount: number | null = null

      if (method.billing === 'per_kg') {
        if (typeof weightKg !== 'number' || weightKg <= 0) return null
        const customRate = resolveOverrideRate(overrides, method.id, 'ratePerKg')
        const rate = typeof customRate === 'number' ? customRate : method.rate
        billedAmount = roundCurrency(weightKg * rate)
      } else {
        const vol = volumeM3
        if (typeof vol !== 'number' || vol <= 0) return null
        const customRate = resolveOverrideRate(overrides, method.id, 'ratePerM3')
        const rate = typeof customRate === 'number' ? customRate : method.rate
        billedAmount = roundCurrency(vol * rate)
      }

      if (billedAmount === null) return null

      const minCharge = method.minimumCharge ?? 0
      const flatFeeOverride = resolveOverrideRate(overrides, method.id, 'flatFee')
      const flatFee = typeof flatFeeOverride === 'number' ? flatFeeOverride : 0
      const cost = roundCurrency(Math.max(billedAmount, minCharge) + flatFee)
      if (cost === null) return null

      const total = salePrice !== null ? roundCurrency(salePrice + cost) : null

      return {
        id: method.id,
        label: method.label,
        description: method.description,
        durationDays: method.durationDays,
        cost: cost ?? 0,
        total: total ?? cost ?? 0,
        currency
      }
    })
    .filter((option): option is ShippingOptionPricing => option !== null)

  const availabilityLabel = isInStock
    ? 'Disponible immédiatement à Dakar'
    : `Commande sur demande (${product.leadTimeDays ?? 15} jours estimés)`

  return {
    baseCost,
    marginRate,
    salePrice,
    currency,
    shippingOptions,
    availabilityLabel,
    availabilitySubLabel: product.availabilityNote || undefined
  }
}

