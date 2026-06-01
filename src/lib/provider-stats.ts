import User from '@/lib/models/User'

/**
 * Helpers pour gérer les stats de fiabilité du provider.
 *
 * Reliability score (0..100) :
 * - Démarre à 100
 * - -15 pts si annulation pendant in_progress (très grave)
 * - -10 pts si annulation pendant provider_arriving
 * - -5 pts si annulation après assigned (avant départ)
 * - +1 pt par mission complétée (bonus, plafonné à 100)
 *
 * Pondération douce pour les nouveaux providers (premières missions).
 */

type CancelSeverity = 'after_assigned' | 'after_arriving' | 'after_in_progress'

const PENALTY: Record<CancelSeverity, number> = {
  after_assigned: 5,
  after_arriving: 10,
  after_in_progress: 15,
}

export function severityFromStatus(prevStatus: string): CancelSeverity {
  if (prevStatus === 'in_progress') return 'after_in_progress'
  if (prevStatus === 'provider_arriving') return 'after_arriving'
  return 'after_assigned'
}

export async function incrementProviderCompleted(providerId: string) {
  try {
    await User.updateOne(
      { _id: providerId },
      {
        $inc: { 'providerStats.completedMissions': 1 },
        $set: { 'providerStats.lastUpdatedAt': new Date() },
        $max: { 'providerStats.reliabilityScore': 100 }, // remet à 100 si plus haut (bonus pas implémenté)
      },
      { upsert: false }
    )
    // Bonus: +1 sur le score, plafonné via update conditionnel séparé
    await User.updateOne(
      { _id: providerId, 'providerStats.reliabilityScore': { $lt: 100 } },
      { $inc: { 'providerStats.reliabilityScore': 1 } }
    )
  } catch (e) {
    console.error('[providerStats] increment completed', e)
  }
}

export async function penalizeProviderCancellation(
  providerId: string,
  severity: CancelSeverity
) {
  try {
    const penalty = PENALTY[severity]
    // Atomic decrement, clamped to 0 via subsequent update
    await User.updateOne(
      { _id: providerId },
      {
        $inc: {
          'providerStats.cancelledByProvider': 1,
          'providerStats.reliabilityScore': -penalty,
        },
        $set: { 'providerStats.lastUpdatedAt': new Date() },
      }
    )
    // Clamp à 0 si négatif
    await User.updateOne(
      { _id: providerId, 'providerStats.reliabilityScore': { $lt: 0 } },
      { $set: { 'providerStats.reliabilityScore': 0 } }
    )
  } catch (e) {
    console.error('[providerStats] penalize cancellation', e)
  }
}

export async function recordClientCancellation(providerId: string) {
  try {
    await User.updateOne(
      { _id: providerId },
      {
        $inc: { 'providerStats.cancelledByClient': 1 },
        $set: { 'providerStats.lastUpdatedAt': new Date() },
      }
    )
  } catch (e) {
    console.error('[providerStats] record client cancellation', e)
  }
}
