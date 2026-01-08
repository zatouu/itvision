/**
 * Engines Module Index - IT Vision
 * 
 * Point d'entrée pour tous les moteurs métier.
 * 
 * @module lib/engines
 */

// Suggestion Engine
export { 
  SuggestionEngine,
  SuggestionConsumer,
  suggestionEngine,
  getSuggestionsForApi,
} from './suggestion'

export type {
  ProductScore,
  SuggestionReason,
  SuggestionContext,
  SuggestionResult,
} from './suggestion'

// Profitability Engine
export {
  ProfitabilityEngine,
  ProfitabilityConsumer,
  profitabilityEngine,
} from './profitability'

export type {
  ProductProfitability,
  CategoryProfitability,
  CustomerProfitability,
  ProfitabilityReport,
} from './profitability'

// Loyalty Engine
export {
  LoyaltyEngine,
  loyaltyEngine,
  LOYALTY_TIERS,
  POINTS_RULES,
} from './loyalty'

export type {
  LoyaltyTier,
  LoyaltyPoints,
  PointsTransaction,
  Reward,
} from './loyalty'
