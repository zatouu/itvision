/**
 * Types partagés du Visibility Engine / Visibility Scheduler.
 *
 * Le "cœur de décision" (ranking + engine) est PUR : il ne dépend d'aucune IO
 * (ni DB, ni Redis, ni socket). Toutes les entrées sont fournies via ces types,
 * ce qui rend la logique métier testable unitairement et remplaçable.
 */

export interface GeoPoint {
  lat: number
  lng: number
}

export type PositionSource = 'gps' | 'last_known' | 'profile_city' | 'none'

/** Statut de présence temps réel d'un prestataire (issu du socket/geo). */
export type PresenceStatus = 'available' | 'viewing' | 'on_mission' | 'offline'

/**
 * Un prestataire candidat à une mission, enrichi de toutes les données
 * nécessaires au scoring et à l'éligibilité. Construit par ProviderPresenceService.
 */
export interface ProviderCandidate {
  providerId: string
  name?: string
  // Position effective résolue (GPS récent → dernière connue → ville profil)
  position: GeoPoint | null
  positionSource: PositionSource
  positionAgeSec: number | null
  distanceKm: number | null // distance à la mission ; null si position inconnue
  // Éligibilité
  kycVerified: boolean
  categories: string[]
  secondaryCategories: string[]
  availabilityStatus: string
  available: boolean
  presenceStatus: PresenceStatus
  currentLoad: number
  maxConcurrentMissions: number | null
  // Signaux de ranking
  ratingAvg: number | null // 0..5
  avgResponseSec: number | null
  // Abonnement / visibilité (monétisation)
  tier: string
  visibilityRadiusKm: number // rayon de visibilité effectif ; -1 = illimité
  priorityLevel: number
  boostMultiplier: number
}

export interface RankedProvider extends ProviderCandidate {
  score: number
  scoreBreakdown: Record<string, number>
}

/** Une vague de diffusion (un palier d'escalade appliqué à un ensemble de prestataires). */
export interface WavePlan {
  stage: number
  radiusKm: number
  delaySec: number
  minOffersToStop: number
  minProvidersToStop: number
  providerIds: string[]
}

export interface NotificationPlan {
  requestId: string
  totalCandidates: number
  totalEligible: number
  waves: WavePlan[]
}

/** Contexte minimal d'une mission passé au moteur (pas le document Mongoose complet). */
export interface DispatchRequestContext {
  requestId: string
  clientId: string
  category: string
  location: GeoPoint
  budget?: number | null
  description?: string | null
  createdAt: Date
}

/** Résultat d'exécution d'une vague par le NotificationEngine. */
export interface WaveDispatchResult {
  stage: number
  radiusKm: number
  providerIds: string[]
  socketCount: number
  pushDelivered: number
  pushTokenCount: number
}
