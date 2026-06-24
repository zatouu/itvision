/**
 * Pricing Engine — API publique centralisée pour tous les calculs de prix.
 *
 * Ce module expose les fonctions et types utilisés par les trois domaines :
 * - marketplace : panier, sourcing, achats groupés
 * - corporate : prix B2B / wholesale
 * - services : points d'escrow, wallet (si applicable)
 */

// Tarifs de base et constantes
export {
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_SERVICE_FEE_RATE,
  DEFAULT_INSURANCE_RATE,
  SERVICE_FEE_RATES,
  type ServiceFeeRate
} from './constants'

// Taux de change
export {
  getCNYToXOFRate,
  getCurrentExchangeRate,
  refreshExchangeRate,
  convertCNYtoXOF,
  getExchangeRateInfo,
  handleExchangeRateRequest,
  DEFAULT_EXCHANGE_RATE as FALLBACK_EXCHANGE_RATE
} from './exchange-rate'

// Résolution du prix applicable au produit (retail / wholesale)
export {
  resolveProductPrice,
  isWholesaleAccount,
  getWholesalePriceDisplay,
  type MarketplaceTier,
  type ResolvedPrice
} from './resolve-product-price'

// Réduction par paliers de quantité
export {
  applyTierDiscount,
  getTierForQuantity,
  QUANTITY_TIERS,
  type TierPricing
} from './tiered-pricing'

// Frais de service dégressifs
export {
  calculateCompleteFees,
  getServiceFeeTier,
  type ServiceFeeTier
} from './tiered-service-fees'

// Calcul complet du panier
export {
  calculateCartTotal,
  type CartItem,
  type ShippingCalculation,
  type CompleteCartCalculation
} from './cart-calculator'

// Poids volumétrique
export {
  calculateBilledWeight,
  calculateVolumetricWeight,
  isVolumetricProduct,
  getVolumetricRatio,
  VOLUMETRIC_DIVISOR
} from './volumetric-weight'

// Paramètres de pricing (configurable admin)
export {
  readPricingDefaults,
  writePricingDefaults,
  type PricingDefaults
} from './settings'

// Overrides manuels
export {
  readPriceOverrides,
  writePriceOverrides
} from './overrides'

// Type d'override partagé
export { type PriceOverride } from '@/types/pricing'

// Surveillance de prix
export {
  checkProductPrice,
  checkAllProductPrices,
  createPriceUpdateData,
  analyzePriceHistory,
  formatPriceAlert,
  type PriceCheckResult,
  type PriceAlert
} from './price-monitoring'
