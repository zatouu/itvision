/**
 * ProviderRankingService (PUR — aucune IO)
 *
 * Calcule le "Visibility Score" de chaque prestataire à partir d'un registre de
 * facteurs pondérés, puis applique le multiplicateur de boost (tier/monétisation).
 *
 * Le registre de facteurs est extensible : pour ajouter un futur signal
 * (ancienneté, taux d'annulation, badge Pro, sponsorisation…), il suffit d'ajouter
 * une entrée dans FACTORS et un poids dans la config `scoreWeights` — sans toucher
 * au reste du moteur.
 */

import { IVisibilityConfig } from '../models/AppConfig'
import { ProviderCandidate, RankedProvider, DispatchRequestContext, PresenceStatus } from './types'

export type ScoreFactor = {
  key: string
  /** Retourne un score normalisé dans [0, 1]. */
  compute: (c: ProviderCandidate, req: DispatchRequestContext, config: IVisibilityConfig) => number
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

const AVAILABILITY_SCORE: Record<PresenceStatus, number> = {
  available: 1,
  viewing: 0.7,
  on_mission: 0.3,
  offline: 0.2,
}

/** Registre des facteurs de score. `key` doit correspondre à une clé de scoreWeights. */
export const FACTORS: ScoreFactor[] = [
  {
    key: 'distance',
    compute: (c, _req, config) => {
      if (c.distanceKm == null) return 0
      const r = Math.max(1, config.maxRadiusKm)
      return clamp01(1 - c.distanceKm / r)
    },
  },
  {
    key: 'availability',
    compute: (c) => AVAILABILITY_SCORE[c.presenceStatus] ?? 0.2,
  },
  {
    key: 'category',
    compute: (c, req) => (c.categories.includes(req.category) ? 1 : 0),
  },
  {
    key: 'rating',
    // Neutre (0.6) si aucune note, sinon normalisé sur 5.
    compute: (c) => (c.ratingAvg == null ? 0.6 : clamp01(c.ratingAvg / 5)),
  },
  {
    key: 'responsiveness',
    // Neutre (0.5) si inconnu ; plus rapide = meilleur (référence 120s).
    compute: (c) => (c.avgResponseSec == null ? 0.5 : clamp01(1 / (1 + c.avgResponseSec / 120))),
  },
]

/** Calcule le score d'un prestataire + le détail par facteur. */
export function scoreProvider(
  candidate: ProviderCandidate,
  req: DispatchRequestContext,
  config: IVisibilityConfig,
): { score: number; breakdown: Record<string, number> } {
  const weights = config.scoreWeights as unknown as Record<string, number>
  const totalWeight = FACTORS.reduce((sum, f) => sum + (weights[f.key] ?? 0), 0) || 1

  const breakdown: Record<string, number> = {}
  let weighted = 0
  for (const factor of FACTORS) {
    const w = weights[factor.key] ?? 0
    const raw = clamp01(factor.compute(candidate, req, config))
    const contribution = (w / totalWeight) * raw
    breakdown[factor.key] = Number(contribution.toFixed(6))
    weighted += contribution
  }

  const boost = candidate.boostMultiplier > 0 ? candidate.boostMultiplier : 1
  const score = Number((weighted * boost).toFixed(6))
  breakdown._base = Number(weighted.toFixed(6))
  breakdown._boost = boost
  return { score, breakdown }
}

/** Classe les prestataires par score décroissant (tie-break: priorityLevel puis distance). */
export function rankProviders(
  candidates: ProviderCandidate[],
  req: DispatchRequestContext,
  config: IVisibilityConfig,
): RankedProvider[] {
  const ranked: RankedProvider[] = candidates.map(c => {
    const { score, breakdown } = scoreProvider(c, req, config)
    return { ...c, score, scoreBreakdown: breakdown }
  })
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.priorityLevel !== a.priorityLevel) return b.priorityLevel - a.priorityLevel
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY
    return da - db
  })
  return ranked
}
