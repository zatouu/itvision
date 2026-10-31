import { connectMongoose } from '../mongoose'
import { getAppConfig, debitPoints, creditPoints } from '../wallet'
import { AI_FEATURE_KEYS, AI_AUTO_FEATURES, type AiFeatureKey, type IAiConfig, type IAiFeatureConfig } from '../models/AppConfig'
import AiUsage from '../models/AiUsage'
import ProviderProfile from '../models/ProviderProfile'
import Wallet from '../models/Wallet'

/**
 * Contrôle d'accès aux fonctionnalités IA (gratuit MVP → semi-premium).
 *
 * Ordre de décision pour un appel :
 *  1. IA désactivée globalement ou feature désactivée      → denied 'ai_disabled'
 *  2. freeUntil non dépassé, ou feature en mode 'free'     → allowed (gratuit)
 *  3. mode 'eligible' et prestataire éligible              → allowed (gratuit)
 *  4. quota journalier gratuit restant                     → allowed (gratuit, quota consommé)
 *  5. XC suffisants                                        → allowed (XC débités)
 *  6. sinon                                                → denied 'quota_exceeded' | 'insufficient_points'
 */

export type AiActorRole = 'client' | 'provider'

export type AiDenyReason = 'ai_disabled' | 'quota_exceeded' | 'insufficient_points'

export interface AiEntitlementDecision {
  allowed: boolean
  reason?: AiDenyReason
  /** XC débités pour cet appel (0 si gratuit) */
  cost: number
  /** Appels gratuits restants aujourd'hui après cet appel */
  quotaRemaining: number
  /** Solde XC après débit (undefined si non consulté) */
  balance?: number
  eligible: boolean
}

export interface AiFeaturesStatus {
  enabled: boolean
  free: boolean
  features: Record<AiFeatureKey, { enabled: boolean; mode: IAiFeatureConfig['mode'] }>
  quota: { limit: number; used: number; remaining: number }
  pricing: { textCostPoints: number; visionCostPoints: number }
  balance: number
  eligible: boolean
  maxImagesPerCall: number
}

const DEFAULT_FEATURE: IAiFeatureConfig = { enabled: true, mode: 'quota' }

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function roleToActor(role: string | undefined): AiActorRole {
  return String(role || '').toUpperCase() === 'PROVIDER' ? 'provider' : 'client'
}

/** Config IA avec valeurs par défaut (les anciens documents AppConfig n'ont pas encore le bloc `ai`). */
export async function getAiConfig(): Promise<IAiConfig> {
  const cfg = await getAppConfig()
  const ai = (cfg.ai || {}) as Partial<IAiConfig>
  const features = Object.fromEntries(
    AI_FEATURE_KEYS.map(k => [k, { ...DEFAULT_FEATURE, ...(AI_AUTO_FEATURES.includes(k) ? { mode: 'free' } : {}), ...(ai.features?.[k] || {}) }])
  ) as Record<AiFeatureKey, IAiFeatureConfig>
  return {
    enabled: ai.enabled !== false,
    freeUntil: ai.freeUntil,
    features,
    eligibility: { minCompletedMissions: 10, minScoreXeuy: 70, minReliability: 80, requireKyc: true, ...(ai.eligibility || {}) },
    pricing: { textCostPoints: 1, visionCostPoints: 3, ...(ai.pricing || {}) },
    dailyFreeQuota: { client: 2, provider: 2, ...(ai.dailyFreeQuota || {}) },
    maxImagesPerCall: ai.maxImagesPerCall || 3,
  }
}

function isGlobalFree(ai: IAiConfig): boolean {
  return !!ai.freeUntil && new Date(ai.freeUntil).getTime() > Date.now()
}

async function isProviderEligible(userId: string, ai: IAiConfig): Promise<boolean> {
  const profile = await ProviderProfile.findOne({ userId }).lean()
  if (!profile) return false
  const e = ai.eligibility
  if (e.requireKyc && !profile.kycVerified) return false
  if ((profile.providerStats?.completedMissions || 0) < e.minCompletedMissions) return false
  if ((profile.scoreXeuy || 0) < e.minScoreXeuy) return false
  if ((profile.providerStats?.reliabilityScore ?? 100) < e.minReliability) return false
  return true
}

async function getPointsBalance(userId: string): Promise<number> {
  const wallet = (await Wallet.findOne({ userId }, { points: 1 }).lean()) as { points?: number } | null
  return wallet?.points || 0
}

async function getUsedToday(userId: string): Promise<number> {
  const usage = await AiUsage.findOne({ userId, day: todayKey() }, { calls: 1 }).lean()
  return usage?.calls || 0
}

async function recordUsage(userId: string, feature: string, vision: boolean, pointsSpent: number): Promise<void> {
  await AiUsage.updateOne(
    { userId, day: todayKey() },
    { $inc: { calls: 1, visionCalls: vision ? 1 : 0, pointsSpent, [`byFeature.${feature}`]: 1 } },
    { upsert: true },
  )
}

/**
 * Vérifie et consomme le droit d'appel IA. À appeler AVANT l'appel modèle ;
 * en cas d'échec du modèle, appeler `refundAiCall` pour rembourser.
 */
export async function checkAiEntitlement(
  userId: string,
  role: string | undefined,
  feature: AiFeatureKey,
  opts: { vision?: boolean } = {},
): Promise<AiEntitlementDecision> {
  await connectMongoose()
  const ai = await getAiConfig()
  const actor = roleToActor(role)
  const fc = ai.features[feature] || DEFAULT_FEATURE
  const vision = !!opts.vision
  const photoFc = vision ? ai.features.photo_analysis : undefined
  const quotaLimit = ai.dailyFreeQuota[actor]

  const finish = async (cost: number, eligible: boolean, balance?: number): Promise<AiEntitlementDecision> => {
    await recordUsage(userId, feature, vision, cost)
    const used = await getUsedToday(userId)
    return { allowed: true, cost, quotaRemaining: Math.max(0, quotaLimit - used), balance, eligible }
  }

  if (!ai.enabled || !fc.enabled || (photoFc && !photoFc.enabled)) {
    return { allowed: false, reason: 'ai_disabled', cost: 0, quotaRemaining: 0, eligible: false }
  }

  // Le mode le plus restrictif entre la feature et photo_analysis s'applique quand il y a des images
  const modes = [fc.mode, photoFc?.mode].filter(Boolean)
  const mode = modes.includes('points') ? 'points' : modes.includes('eligible') ? 'eligible' : modes.includes('quota') ? 'quota' : 'free'

  if (isGlobalFree(ai) || mode === 'free') return finish(0, false)

  const eligible = actor === 'provider' && mode === 'eligible' ? await isProviderEligible(userId, ai) : false
  if (eligible) return finish(0, true)

  const used = await getUsedToday(userId)
  if (used < quotaLimit) return finish(0, false)

  const cost = vision ? ai.pricing.visionCostPoints : ai.pricing.textCostPoints
  if (cost <= 0) return finish(0, false)

  const debit = await debitPoints(userId, cost, 'ai_spend', { description: `Assistant IA — ${feature}${vision ? ' (photos)' : ''}` })
  if (!debit) {
    const balance = await getPointsBalance(userId)
    return {
      allowed: false,
      reason: mode === 'quota' && balance === 0 ? 'quota_exceeded' : 'insufficient_points',
      cost,
      quotaRemaining: 0,
      balance,
      eligible: false,
    }
  }
  return finish(cost, false, debit.balance)
}

/** Rembourse un appel facturé dont le modèle a échoué. */
export async function refundAiCall(userId: string, decision: AiEntitlementDecision, feature: string): Promise<void> {
  if (!decision.allowed) return
  try {
    await AiUsage.updateOne(
      { userId, day: todayKey() },
      { $inc: { calls: -1, pointsSpent: -decision.cost, [`byFeature.${feature}`]: -1 } },
    )
    if (decision.cost > 0) {
      await creditPoints(userId, decision.cost, 'refund', { description: `Remboursement IA — ${feature} (échec)` })
    }
  } catch (err) {
    console.warn('[AI entitlement] refund failed:', err instanceof Error ? err.message : err)
  }
}

/** État des fonctionnalités IA pour l'utilisateur courant (consommé par le mobile pour afficher/masquer les boutons). */
export async function getAiFeaturesStatus(userId: string, role: string | undefined): Promise<AiFeaturesStatus> {
  await connectMongoose()
  const ai = await getAiConfig()
  const actor = roleToActor(role)
  const [used, balance, eligible] = await Promise.all([
    getUsedToday(userId),
    getPointsBalance(userId),
    actor === 'provider' ? isProviderEligible(userId, ai) : Promise.resolve(false),
  ])
  const limit = ai.dailyFreeQuota[actor]
  return {
    enabled: ai.enabled,
    free: isGlobalFree(ai),
    features: Object.fromEntries(
      AI_FEATURE_KEYS.map(k => [k, { enabled: ai.enabled && ai.features[k].enabled, mode: ai.features[k].mode }])
    ) as AiFeaturesStatus['features'],
    quota: { limit, used, remaining: Math.max(0, limit - used) },
    pricing: ai.pricing,
    balance,
    eligible,
    maxImagesPerCall: ai.maxImagesPerCall,
  }
}
