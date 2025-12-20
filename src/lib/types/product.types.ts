/**
 * Types TypeScript stricts pour les produits
 * Garantit la cohérence entre frontend et backend
 */

import type { ShippingMethodId } from '../logistics'

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type StockStatus = 'in_stock' | 'preorder' | 'out_of_stock'
export type ServiceFeeRate = 5 | 10 | 15
export type Currency = 'FCFA' | 'EUR' | 'USD' | 'CNY'

// ============================================================================
// PRICING 1688
// ============================================================================

export interface Pricing1688Input {
  price1688?: number // Prix en Yuan (¥)
  baseCost?: number // Prix déjà converti en FCFA
  exchangeRate?: number // Taux de change (défaut: 100)
  serviceFeeRate?: ServiceFeeRate // 5, 10, ou 15
  insuranceRate?: number // Pourcentage (défaut: 2.5% obligatoire)
  shippingMethod: ShippingMethodId
  weightKg?: number
  volumeM3?: number
  orderQuantity?: number
  monthlyVolume?: number
}

export interface Pricing1688Breakdown {
  productCostFCFA: number
  shippingCostReal: number
  serviceFee: number
  insuranceFee: number
  totalRealCost: number
  shippingCostClient: number
  totalClientPrice: number
  shippingMargin: number
  netMargin: number
  marginPercentage: number
  cumulativeMargin?: number
  estimatedMonthlyProfit?: number
  currency: Currency
  shippingMethodLabel: string
  shippingMethodDuration: number
}

export interface Pricing1688Data {
  price1688: number
  price1688Currency: Currency
  exchangeRate: number
  serviceFeeRate: ServiceFeeRate | null
  insuranceRate: number | null
  breakdown?: Pricing1688Breakdown
}

// ============================================================================
// LOGISTIQUE
// ============================================================================

export interface ProductDimensions {
  lengthCm: number
  widthCm: number
  heightCm: number
}

export interface ProductLogistics {
  weightKg: number | null
  packagingWeightKg: number | null
  volumeM3: number | null
  dimensions: ProductDimensions | null
}

// ============================================================================
// SOURCING
// ============================================================================

export interface ProductSourcing {
  platform: string | null
  supplierName: string | null
  supplierContact: string | null
  productUrl: string | null
  notes: string | null
}

// ============================================================================
// SHIPPING OVERRIDES
// ============================================================================

export interface ShippingOverride {
  methodId: ShippingMethodId
  ratePerKg?: number
  ratePerM3?: number
  flatFee?: number
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export interface ProductAvailability {
  status: StockStatus
  label: string
  note: string | null
  stockQuantity: number
  leadTimeDays: number | null
}

// ============================================================================
// PRICING STANDARD
// ============================================================================

export interface ShippingOption {
  id: ShippingMethodId
  label: string
  description: string
  durationDays: number
  cost: number
  currency: Currency
  total: number
}

export interface ProductPricing {
  currency: Currency
  salePrice: number | null
  requiresQuote: boolean
  availabilityLabel: string
  availabilitySubLabel: string | null
  shippingOptions: ShippingOption[]
}

// ============================================================================
// PRODUIT COMPLET (API Response)
// ============================================================================

export interface ProductResponse {
  id: string
  name: string
  tagline: string | null
  description: string | null
  category: string | null
  image: string
  gallery: string[]
  features: string[]
  colorOptions: string[]
  variantOptions: string[]
  requiresQuote: boolean
  pricing: ProductPricing
  pricing1688: Pricing1688Data | null
  availability: ProductAvailability
  logistics: ProductLogistics
  sourcing: ProductSourcing | null
  createdAt: string | null
  updatedAt: string | null
  isFeatured: boolean
  rating?: number
}

// ============================================================================
// PRODUIT SIMPLIFIÉ (Liste/Carte)
// ============================================================================

export interface ProductSummary {
  id: string
  name: string
  tagline: string | null
  category: string | null
  image: string
  priceAmount: number | null
  currency: Currency
  requiresQuote: boolean
  availabilityStatus: StockStatus
  availabilityLabel: string
  shippingOptions: ShippingOption[]
  deliveryDays: number | null
  pricing1688: Pricing1688Data | null
  rating?: number
}

// ============================================================================
// PRODUIT ADMIN (CRUD)
// ============================================================================

export interface ProductCreateInput {
  name: string
  category?: string
  description?: string
  tagline?: string
  price?: number
  baseCost?: number
  marginRate?: number
  currency?: Currency
  image?: string
  gallery?: string[]
  features?: string[]
  requiresQuote?: boolean
  deliveryDays?: number
  stockStatus?: StockStatus
  stockQuantity?: number
  leadTimeDays?: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  packagingWeightKg?: number
  colorOptions?: string[]
  variantOptions?: string[]
  availabilityNote?: string
  isPublished?: boolean
  isFeatured?: boolean
  sourcing?: Partial<ProductSourcing>
  shippingOverrides?: ShippingOverride[]
  // 1688
  price1688?: number
  price1688Currency?: Currency
  exchangeRate?: number
  serviceFeeRate?: ServiceFeeRate
  insuranceRate?: number
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  id: string
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const validateServiceFeeRate = (rate: number | undefined): rate is ServiceFeeRate => {
  return rate === 5 || rate === 10 || rate === 15
}

export const validateStockStatus = (status: string | undefined): status is StockStatus => {
  return status === 'in_stock' || status === 'preorder' || status === 'out_of_stock'
}

export const validateCurrency = (currency: string | undefined): currency is Currency => {
  return currency === 'FCFA' || currency === 'EUR' || currency === 'USD' || currency === 'CNY'
}

