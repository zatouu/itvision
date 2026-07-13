/**
 * VisibilityConfigService
 *
 * Source unique de la configuration du Visibility Engine.
 * Lit le bloc `visibility` du singleton AppConfig (key: 'global') et complète
 * les valeurs manquantes par des défauts sûrs. AUCUNE valeur métier n'est codée
 * en dur ailleurs : tout passe par cette config, modifiable sans redéploiement.
 */

import AppConfig, { IVisibilityConfig } from '../models/AppConfig'
import { connectMongoose } from '../mongoose'

/** Défauts canoniques — utilisés aussi par les tests unitaires (sans DB). */
export const DEFAULT_VISIBILITY_CONFIG: IVisibilityConfig = {
  enabled: true,
  requireKycForNotification: false,
  defaultRadiusKm: 10,
  maxRadiusKm: 200,
  presenceFreshnessSec: 600,
  maxProvidersPerWave: 50,
  escalation: [
    { stage: 0, radiusKm: 10, delaySec: 0, minOffersToStop: 1, minProvidersToStop: 5 },
    { stage: 1, radiusKm: 20, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 8 },
    { stage: 2, radiusKm: 30, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 12 },
    { stage: 3, radiusKm: 60, delaySec: 180, minOffersToStop: 1, minProvidersToStop: 20 },
    { stage: 4, radiusKm: 150, delaySec: 300, minOffersToStop: 1, minProvidersToStop: 40 },
  ],
  scoreWeights: {
    distance: 0.4,
    availability: 0.2,
    category: 0.2,
    rating: 0.1,
    responsiveness: 0.1,
  },
  tiers: [
    { id: 'free', label: 'Gratuit', radiusKm: 10, priorityLevel: 0, boostMultiplier: 1 },
    { id: 'plus', label: 'Plus', radiusKm: 20, priorityLevel: 1, boostMultiplier: 1.2 },
    { id: 'pro', label: 'Pro', radiusKm: 30, priorityLevel: 2, boostMultiplier: 1.5 },
    { id: 'unlimited', label: 'Illimité', radiusKm: -1, priorityLevel: 3, boostMultiplier: 2 },
  ],
  fallback: {
    useLastKnownPosition: true,
    useProfileCity: true,
  },
}

/** Fusionne la config DB avec les défauts (les tableaux non vides remplacent les défauts). */
export function mergeVisibilityConfig(partial?: Partial<IVisibilityConfig> | null): IVisibilityConfig {
  const d = DEFAULT_VISIBILITY_CONFIG
  if (!partial) return { ...d }
  return {
    enabled: partial.enabled ?? d.enabled,
    requireKycForNotification: partial.requireKycForNotification ?? d.requireKycForNotification,
    defaultRadiusKm: partial.defaultRadiusKm ?? d.defaultRadiusKm,
    maxRadiusKm: partial.maxRadiusKm ?? d.maxRadiusKm,
    presenceFreshnessSec: partial.presenceFreshnessSec ?? d.presenceFreshnessSec,
    maxProvidersPerWave: partial.maxProvidersPerWave ?? d.maxProvidersPerWave,
    escalation: partial.escalation?.length ? [...partial.escalation].sort((a, b) => a.stage - b.stage) : d.escalation,
    scoreWeights: { ...d.scoreWeights, ...(partial.scoreWeights || {}) },
    tiers: partial.tiers?.length ? partial.tiers : d.tiers,
    fallback: { ...d.fallback, ...(partial.fallback || {}) },
  }
}

let cache: { value: IVisibilityConfig; at: number } | null = null
const CACHE_TTL_MS = 30_000

/** Charge la config visibility (cache court 30s). */
export async function getVisibilityConfig(forceReload = false): Promise<IVisibilityConfig> {
  if (!forceReload && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value
  }
  try {
    await connectMongoose()
    const doc = await AppConfig.findOne({ key: 'global' }).select('visibility').lean() as any
    const value = mergeVisibilityConfig(doc?.visibility)
    cache = { value, at: Date.now() }
    return value
  } catch (err: any) {
    console.warn('[Visibility] getVisibilityConfig failed, using defaults:', err?.message)
    return { ...DEFAULT_VISIBILITY_CONFIG }
  }
}

/** Invalide le cache (après écriture admin). */
export function invalidateVisibilityConfigCache(): void {
  cache = null
}

/** Résout le tier d'un prestataire (défaut = premier tier / 'free'). */
export function resolveTier(config: IVisibilityConfig, tierId?: string | null) {
  const tiers = config.tiers.length ? config.tiers : DEFAULT_VISIBILITY_CONFIG.tiers
  return tiers.find(t => t.id === tierId) || tiers[0]
}
