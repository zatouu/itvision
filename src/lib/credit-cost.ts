import AppConfig, { ICreditPack } from './models/AppConfig'
import MissionUnlock from './models/MissionUnlock'
import { connectMongoose } from './mongoose'

export interface UnlockCostInput {
  requestId: string
  category: string
  budget?: number | null
  urgency?: 'low' | 'normal' | 'high' | 'asap' | string
  media?: { type: string }[]
  distanceKm?: number
}

export interface UnlockCostResult {
  cost: number
  breakdown: {
    base: number
    category: number
    urgency: number
    media: number
    distance: number
  }
  refundedAtCancel: boolean
  refundWindowMinutes: number
}

/**
 * Calcule le coût intelligent en crédits pour débloquer une mission.
 *
 * Règles métier :
 * 1. Base selon palier de budget FCFA (configurable dans AppConfig.credits.budgetTiers).
 * 2. Surcharge catégorie "premium" (+N crédits) si configurée.
 * 3. Urgence : +urgencySurcharge si "high" ou "asap".
 * 4. Médias : +1 si vidéo présente (mission plus engageante / coûteuse à traiter).
 * 5. Distance : +1 si > 10 km (incite les providers locaux).
 * 6. Bornes min/max de sécurité depuis AppConfig.
 */
export async function computeUnlockCost(input: UnlockCostInput): Promise<UnlockCostResult> {
  await connectMongoose()
  const cfgDoc = await AppConfig.findOne({ key: 'global' }).lean() as any
  const cfg = cfgDoc?.credits || {}

  const tiers: { maxBudget: number; cost: number }[] = cfg.budgetTiers?.length
    ? cfg.budgetTiers
    : [
        { maxBudget: 10_000, cost: 1 },
        { maxBudget: 30_000, cost: 2 },
        { maxBudget: 75_000, cost: 3 },
        { maxBudget: 200_000, cost: 5 },
        { maxBudget: 1_000_000_000, cost: 6 },
      ]

  const budget = input.budget ?? 0
  let base = tiers.find(t => budget <= t.maxBudget)?.cost ?? tiers[tiers.length - 1].cost

  const premiumCategories: Record<string, number> = cfg.premiumCategories || {}
  const category = input.category || 'default'
  const categoryExtra = premiumCategories[category] ?? 0

  const urgency = (input.urgency || 'normal').toString().toLowerCase()
  const urgencyExtra = ['high', 'asap', 'urgent', 'maintenant'].includes(urgency) ? (cfg.urgencySurcharge ?? 1) : 0

  const hasVideo = (input.media || []).some(m => m.type === 'video')
  const mediaExtra = hasVideo ? 1 : 0

  const distance = input.distanceKm ?? 0
  const distanceExtra = distance > 10 ? 1 : 0

  const minCost = cfg.minUnlockCost ?? 1
  const maxCost = cfg.maxUnlockCost ?? 8

  const cost = Math.max(minCost, Math.min(maxCost, base + categoryExtra + urgencyExtra + mediaExtra + distanceExtra))

  return {
    cost,
    breakdown: {
      base,
      category: categoryExtra,
      urgency: urgencyExtra,
      media: mediaExtra,
      distance: distanceExtra,
    },
    refundedAtCancel: true,
    refundWindowMinutes: cfg.refundWindowMinutes ?? 10,
  }
}

/**
 * Vérifie si un provider a déjà débloqué une mission.
 */
export async function hasUnlocked(providerId: string, requestId: string): Promise<boolean> {
  await connectMongoose()
  const existing = await MissionUnlock.findOne({ providerId, requestId, status: { $in: ['active', 'spent'] } }).lean()
  return !!existing
}

/**
 * Calcule le coût total d'un pack incluant le bonus.
 */
export function packTotalCredits(pack: ICreditPack): number {
  return pack.credits + (pack.bonusCredits || 0)
}

/**
 * Arrondit un montant FCFA à l'unité près (certains opérateurs exigent des montants entiers).
 */
export function roundFcfa(n: number): number {
  return Math.round(n)
}
