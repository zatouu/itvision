import { cacheClearAll } from './storage'
import { resetAllNotifications, resetNotificationBinding } from './notifications'
import { resetSocket } from './socket'
import { clearQueue } from './offlineQueue'
import { unregisterPushToken } from './push'
import { clearUser } from './sentry'

/**
 * Wipe ALL user-specific data (caches, notifications, socket,
 * offline queue, push token, Sentry context).
 * Called on logout so the next user starts from a clean state.
 *
 * Garde-fou rigoureux :
 * - Push token désenregistré côté serveur (le nouvel user ne reçoit pas les push de l'ancien)
 * - Offline queue vidée (les actions de l'ancien user ne sont pas rejouées avec le nouveau token)
 * - Sentry user context cleared (les erreurs ne sont pas attribuées au mauvais user)
 */
export async function clearAllUserData(): Promise<void> {
  // 1. Désenregistrer le push token AVANT de perdre le token auth
  try { await unregisterPushToken() } catch { /* best-effort */ }

  // 2. In-memory resets (synchrones, immédiats)
  resetNotificationBinding()
  clearUser()

  // 3. Async storage cleanup (parallele pour rapidité)
  await Promise.all([
    cacheClearAll(),
    resetAllNotifications(),
    clearQueue(),
  ])

  // 4. Socket teardown en dernier (drop rooms + auth)
  resetSocket()
}
