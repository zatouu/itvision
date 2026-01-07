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

// Taux par défaut pour les frais additionnels (centralisés)
import { DEFAULT_SERVICE_FEE_RATE, DEFAULT_INSURANCE_RATE, DEFAULT_EXCHANGE_RATE } from './pricing/constants'
import { readPricingDefaults } from './pricing/settings'

export interface PricingFees {
  serviceFeeRate: number // Pourcentage
  serviceFeeAmount: number // Montant en FCFA
  insuranceRate: number // Pourcentage
  insuranceAmount: number // Montant en FCFA
}

export interface ProductPricingSummary {
  baseCost: number | null
  marginRate: number
  salePrice: number | null
  currency: string
  shippingOptions: ShippingOptionPricing[]
  availabilityLabel: string
  availabilitySubLabel?: string
  // Frais additionnels (pour import)
  fees?: PricingFees
  totalWithFees?: number | null // Prix total incluant frais de service et assurance
}

// Taux de transport réels (coûts internes - pour calcul marge)
export const REAL_SHIPPING_COSTS: Record<ShippingMethodId, { rate: number; minimumCharge?: number }> = {
  air_express: {
    rate: 11000, // 11 000 CFA/kg (coût réel interne)
    minimumCharge: 20000
  },
  air_15: {
    rate: 7000, // 7 000 CFA/kg (coût réel interne)
    minimumCharge: 15000
  },
  sea_freight: {
    rate: 130000, // 130 000 CFA/m³ (coût réel interne)
    minimumCharge: 130000
  }
}

// Taux de transport déclarés aux clients (prix facturé par défaut)
export const BASE_SHIPPING_RATES: Record<ShippingMethodId, ShippingRate> = {
  air_express: {
    id: 'air_express',
    label: 'Express 3j',
    description: 'Livraison express porte-à-porte',
    durationDays: 3,
    billing: 'per_kg',
    rate: 12000, // 12 000 CFA/kg
    minimumCharge: 20000
  },
  air_15: {
    id: 'air_15',
    label: 'Aérien 15j',
    description: 'Fret aérien économique',
    durationDays: 15,
    billing: 'per_kg',
    rate: 8000, // 8 000 CFA/kg
    minimumCharge: 15000
  },
  sea_freight: {
    id: 'sea_freight',
    label: 'Maritime 60j',
    description: 'Groupage maritime économique',
    durationDays: 60,
    billing: 'per_cubic_meter',
    rate: 140000, // 140 000 CFA/m³
    minimumCharge: 140000
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

  // Charger éventuels réglages globaux définis par l'admin
  const globalDefaults = (() => {
    try {
      return readPricingDefaults()
    } catch (err) {
      return { defaultExchangeRate: DEFAULT_EXCHANGE_RATE, defaultServiceFeeRate: DEFAULT_SERVICE_FEE_RATE, defaultInsuranceRate: DEFAULT_INSURANCE_RATE }
    }
  })()

  // Calculer le coût fournisseur en FCFA : priorité `baseCost`, sinon convertir
  // `price1688` via le taux admin si disponible, sinon la valeur par défaut.
  let productCostFCFA: number | null = null
  if (baseCost !== null) {
    productCostFCFA = baseCost
  } else if (typeof product.price1688 === 'number' && product.price1688 > 0) {
    productCostFCFA = roundCurrency(product.price1688 * (product.exchangeRate || globalDefaults.defaultExchangeRate || DEFAULT_EXCHANGE_RATE))
  }

  const salePrice = productCostFCFA !== null
    ? roundCurrency(productCostFCFA * (1 + marginRate / 100))
    : (typeof product.price === 'number' ? roundCurrency(product.price) : null)

  const weightKg = typeof product.weightKg === 'number' ? product.weightKg : undefined
  const volumeM3 = computeVolume(product)
  const overrides = product.shippingOverrides
  const isInStock = product.stockStatus === 'in_stock'
  
  // Déterminer si le produit est importé
  const isImported = !!(product.price1688 || (product.sourcing?.platform && ['1688', 'alibaba', 'taobao'].includes(product.sourcing.platform)))

  // Calcul des frais additionnels (uniquement pour les produits importés avec un prix)
  let fees: PricingFees | undefined
  let totalWithFees: number | null = null
  
  if (isImported && salePrice !== null && salePrice > 0 && productCostFCFA !== null) {
    const serviceFeeRate = typeof product.serviceFeeRate === 'number' ? product.serviceFeeRate : (globalDefaults.defaultServiceFeeRate ?? DEFAULT_SERVICE_FEE_RATE)
    const insuranceRate = typeof product.insuranceRate === 'number' ? product.insuranceRate : (globalDefaults.defaultInsuranceRate ?? DEFAULT_INSURANCE_RATE)

    // Frais calculés sur le prix fournisseur (isoler supplier price)
    const serviceFeeAmount = roundCurrency(productCostFCFA * (serviceFeeRate / 100)) ?? 0
    const insuranceAmount = roundCurrency(productCostFCFA * (insuranceRate / 100)) ?? 0

    fees = {
      serviceFeeRate,
      serviceFeeAmount,
      insuranceRate,
      insuranceAmount
    }

    totalWithFees = roundCurrency(salePrice + serviceFeeAmount + insuranceAmount)
  }

  const shippingOptions: ShippingOptionPricing[] = isInStock
    ? []
    : Object.values(BASE_SHIPPING_RATES)
    .map((method): ShippingOptionPricing | null => {
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

      // Total = prix produit + frais + transport
      const basePrice = totalWithFees ?? salePrice
      const total = basePrice !== null ? roundCurrency(basePrice + cost) : null

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
    availabilitySubLabel: product.availabilityNote || undefined,
    fees,
    totalWithFees
  }
}

