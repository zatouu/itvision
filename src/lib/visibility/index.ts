/**
 * Point d'entrée public du module Visibility Engine / Visibility Scheduler.
 *
 * Usage :
 *  - Au boot (instrumentation.ts) : `startVisibilityScheduler()` — démarre le
 *    scheduler + le Recovery Scheduler (le sweep recharge les tâches persistées).
 *  - À la création d'une mission : `enqueueDispatch(requestId)` (fire-and-forget).
 *  - À la réception d'une offre : `onOffer(requestId)`.
 *  - À l'assignation/annulation : `closeDispatch(requestId, reason)`.
 */

export {
  enqueueDispatch,
  onOffer,
  closeDispatch,
  runVisibilityWave,
  ensureVisibilityStarted,
} from './dispatch'

export { getVisibilityConfig, invalidateVisibilityConfigCache, DEFAULT_VISIBILITY_CONFIG } from './config'
export { getScheduler } from './scheduler'
export { buildNotificationPlan, filterAndRank, isEligible } from './engine'
export { rankProviders, scoreProvider } from './ranking'
export type { ProviderCandidate, RankedProvider, NotificationPlan, DispatchRequestContext } from './types'

import { ensureVisibilityStarted } from './dispatch'

/**
 * Démarre le Visibility Scheduler (idempotent). Le démarrage déclenche
 * immédiatement un sweep de récupération qui recharge les ScheduledTask `pending`
 * échues/à venir après un redémarrage (Recovery Scheduler).
 */
export function startVisibilityScheduler(): void {
  ensureVisibilityStarted()
}
