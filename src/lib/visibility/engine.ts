/**
 * VisibilityEngine (PUR — aucune IO)
 *
 * Cœur de décision de la visibilité des missions :
 *  1. Filtre d'éligibilité (KYC, catégorie, présence, charge).
 *  2. Découpage en vagues d'escalade par rayon (le rayon est une PRIORITÉ,
 *     pas un blocage absolu : on élargit progressivement jusqu'à maxRadiusKm,
 *     jamais tout le pays).
 *  3. Conditions d'arrêt (assez d'offres OU assez de prestataires notifiés).
 *
 * Le ranking (score) est délégué à ranking.ts. Ce module ne fait qu'organiser
 * des prestataires déjà classés en vagues et décider quand arrêter.
 */

import { IVisibilityConfig } from '../models/AppConfig'
import { ProviderCandidate, RankedProvider, NotificationPlan, WavePlan, DispatchRequestContext } from './types'
import { rankProviders } from './ranking'

/**
 * Éligibilité d'un prestataire pour une mission donnée.
 * - KYC validé (obligatoire)
 * - Catégorie compatible (categories vides = généraliste → compatible)
 * - Position résolue (sinon on ne peut pas géolocaliser → jamais de blast national)
 * - Pas en surcharge (currentLoad < maxConcurrentMissions si défini)
 */
export function isEligible(candidate: ProviderCandidate, req: DispatchRequestContext, config?: IVisibilityConfig): boolean {
  if (config?.requireKycForNotification && !candidate.kycVerified) return false
  if (candidate.distanceKm == null) return false
  const cats = candidate.categories || []
  const categoryOk = cats.length === 0 || cats.includes(req.category)
  if (!categoryOk) return false
  if (candidate.maxConcurrentMissions != null && candidate.currentLoad >= candidate.maxConcurrentMissions) return false
  return true
}

/** Filtre + classe les candidats éligibles. */
export function filterAndRank(
  candidates: ProviderCandidate[],
  req: DispatchRequestContext,
  config: IVisibilityConfig,
): { ranked: RankedProvider[]; reasons: Record<string, string> } {
  const reasons: Record<string, string> = {}
  const eligible: ProviderCandidate[] = []
  for (const c of candidates) {
    const ok = isEligible(c, req, config)
    if (!ok) {
      if (config.requireKycForNotification && !c.kycVerified) reasons[c.providerId] = 'kyc_missing'
      else if (c.distanceKm == null) reasons[c.providerId] = 'no_distance'
      else {
        const cats = c.categories || []
        const categoryOk = cats.length === 0 || cats.includes(req.category)
        if (!categoryOk) reasons[c.providerId] = 'category_mismatch'
        else if (c.maxConcurrentMissions != null && c.currentLoad >= c.maxConcurrentMissions) reasons[c.providerId] = 'max_load'
        else reasons[c.providerId] = 'unknown'
      }
      continue
    }
    eligible.push(c)
  }
  return { ranked: rankProviders(eligible, req, config), reasons }
}

/**
 * Sélectionne les prestataires à notifier pour un palier d'escalade donné.
 * Exclut ceux déjà notifiés, filtre par rayon du palier, plafonne à maxProvidersPerWave.
 */
export function selectStageProviders(
  config: IVisibilityConfig,
  stageIndex: number,
  rankedEligible: RankedProvider[],
  alreadyNotified: Set<string>,
): { stage: number; radiusKm: number; providerIds: string[] } {
  const stage = config.escalation[stageIndex]
  if (!stage) return { stage: stageIndex, radiusKm: 0, providerIds: [] }
  const pool = rankedEligible.filter(p =>
    !alreadyNotified.has(p.providerId) &&
    p.distanceKm != null &&
    p.distanceKm <= stage.radiusKm,
  )
  const providerIds = pool.slice(0, config.maxProvidersPerWave).map(p => p.providerId)
  return { stage: stage.stage, radiusKm: stage.radiusKm, providerIds }
}

/**
 * Décide s'il faut ARRÊTER l'escalade avant d'exécuter le palier `stageIndex`.
 * Vrai si assez d'offres reçues OU assez de prestataires déjà notifiés.
 * (Au palier 0, offers=0 et notified=0 → ne s'arrête jamais : la 1re vague part toujours.)
 */
export function shouldStopBeforeStage(
  config: IVisibilityConfig,
  stageIndex: number,
  offersReceived: number,
  totalNotified: number,
): boolean {
  const stage = config.escalation[stageIndex]
  if (!stage) return true
  if (offersReceived >= stage.minOffersToStop) return true
  if (totalNotified >= stage.minProvidersToStop) return true
  return false
}

/** Construit le plan complet de diffusion (toutes les vagues) — utile pour preview/tests. */
export function buildNotificationPlan(
  candidates: ProviderCandidate[],
  req: DispatchRequestContext,
  config: IVisibilityConfig,
): NotificationPlan {
  const { ranked: rankedEligible } = filterAndRank(candidates, req, config)
  const alreadyNotified = new Set<string>()
  const waves: WavePlan[] = []

  for (let i = 0; i < config.escalation.length; i++) {
    const stage = config.escalation[i]
    const { providerIds } = selectStageProviders(config, i, rankedEligible, alreadyNotified)
    if (providerIds.length === 0 && i > 0) {
      // pas de nouveau prestataire à ce palier ; on garde une vague vide pour la trace
    }
    providerIds.forEach(id => alreadyNotified.add(id))
    waves.push({
      stage: stage.stage,
      radiusKm: stage.radiusKm,
      delaySec: stage.delaySec,
      minOffersToStop: stage.minOffersToStop,
      minProvidersToStop: stage.minProvidersToStop,
      providerIds,
    })
  }

  return {
    requestId: req.requestId,
    totalCandidates: candidates.length,
    totalEligible: rankedEligible.length,
    waves,
  }
}
