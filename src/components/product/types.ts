export interface ProductVariant {
  id: string
  name: string
  sku?: string
  image?: string
  price1688?: number
  priceFCFA?: number
  stock: number
  isDefault?: boolean
}

export interface ProductVariantGroup {
  name: string
  variants: ProductVariant[]
}

export interface ProductPricing {
  baseCost: number | null
  marginRate: number
  salePrice: number | null
  currency: string
  shippingOptions: any[]
  availabilityLabel: string
  availabilitySubLabel?: string
  fees?: {
    serviceFeeRate: number
    serviceFeeAmount: number
    insuranceRate: number
    insuranceAmount: number
  }
  totalWithFees?: number | null
}

export interface ProductAvailability {
  status: 'in_stock' | 'preorder' | string
  label: string
  note?: string | null
  stockQuantity: number
  leadTimeDays: number | null
}

export interface ProductLogistics {
  weightKg: number | null
  packagingWeightKg: number | null
  volumeM3: number | null
  dimensions: { lengthCm: number; widthCm: number; heightCm: number } | null
}

export interface ProductDetailData {
  tags?: string[]
  id: string
  name: string
  tagline?: string | null
  description?: string | null
  category?: string | null
  image?: string | null
  condition?: 'new' | 'used' | 'refurbished'
  gallery: string[]
  descriptionImages: string[]
  features: string[]
  colorOptions: string[]
  variantOptions: string[]
  variantGroups?: ProductVariantGroup[]
  requiresQuote: boolean
  currency?: string | null
  pricing: ProductPricing
  availability: ProductAvailability
  logistics: ProductLogistics
  isImported?: boolean
  b2bPrice?: number | null
  groupBuyEnabled?: boolean
  groupBuyBestPrice?: number | null
  groupBuyDiscount?: number | null
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  groupBuyCurrentQty?: number
  priceTiers?: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
  supplier?: {
    name: string
    location: string
    verified: boolean
    yearsInBusiness: number
    rating: number
    transactions: number
    responseTime: string
  }
  sellerName?: string | null
  sellerSlug?: string | null
  sellerVerified?: boolean
  sellerRating?: number | null
}

export interface SimilarProductSummary {
  id: string
  name: string
  tagline?: string | null
  image?: string | null
  priceAmount?: number | null
  priceCurrency?: string | null
  deliveryDays?: number | null
}

export const formatCurrency = (amount?: number | null, currency = 'FCFA') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

export function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}
