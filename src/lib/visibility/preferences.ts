/**
 * Préférences missions du prestataire (ProviderProfile.preferences) — logique PURE.
 *
 * Partagée par la diffusion (engine.isEligible) et la liste « demandes proches »
 * (/api/services/matching) pour qu'un réglage du profil ait le même effet partout.
 * Une préférence absente ne filtre rien ; un budget inconnu n'est jamais exclu.
 */

export interface ProviderMissionPreferences {
  maxDistanceKm: number | null
  minAmount: number | null
  acceptUrgent: boolean
  acceptPlanned: boolean
}

export interface MissionTraits {
  distanceKm?: number | null
  budget?: number | null
  urgent?: boolean
  scheduled?: boolean
}

export type PreferenceRejection = 'max_distance' | 'min_amount' | 'urgent_off' | 'planned_off'

/** Valeur haute du réglage « distance maximale » de l'app : à partir de là, aucune limite. */
export const MAX_DISTANCE_NO_LIMIT_KM = 100

function positiveOrNull(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function normalizeMissionPreferences(raw: unknown): ProviderMissionPreferences {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const maxDistanceKm = positiveOrNull(p.maxDistanceKm)
  return {
    maxDistanceKm: maxDistanceKm != null && maxDistanceKm < MAX_DISTANCE_NO_LIMIT_KM ? maxDistanceKm : null,
    minAmount: positiveOrNull(p.minAmount),
    acceptUrgent: p.urgent !== false,
    acceptPlanned: p.planned !== false,
  }
}

export function preferenceRejection(
  prefs: ProviderMissionPreferences | null | undefined,
  mission: MissionTraits,
): PreferenceRejection | null {
  if (!prefs) return null
  if (prefs.maxDistanceKm != null && mission.distanceKm != null && mission.distanceKm > prefs.maxDistanceKm) return 'max_distance'
  const budget = Number(mission.budget)
  if (prefs.minAmount != null && Number.isFinite(budget) && budget > 0 && budget < prefs.minAmount) return 'min_amount'
  if (mission.urgent && !prefs.acceptUrgent) return 'urgent_off'
  if (mission.scheduled && !mission.urgent && !prefs.acceptPlanned) return 'planned_off'
  return null
}
