import { cacheClearAll } from './storage'
import { clearProfileStorage, resetProfile } from './user-profile'
import { resetAllNotifications, resetNotificationBinding } from './notifications'
import { invalidateWalletCache } from './wallet'
import { resetSocket } from './socket'
import { clearQueue } from './offlineQueue'
import { unregisterPushToken } from './push'
import { resetOnline } from './online'
import { clearUser } from './sentry'

/**
 * Wipe ALL user-specific data (caches, profile, notifications, wallet, socket,
 * offline queue, push token, online state, Sentry context).
 * Called on logout so the next user starts from a clean state.
 *
 * Garde-fou rigoureux :
 * - Push token désenregistré côté serveur (le nouvel user ne reçoit pas les push de l'ancien)
 * - Offline queue vidée (les actions de l'ancien user ne sont pas rejouées avec le nouveau token)
 * - Online state reset (le provider n'apparaît pas "available" avec le mauvais compte)
 * - Sentry user context cleared (les erreurs ne sont pas attribuées au mauvais user)
 */
export async function clearAllUserData(): Promise<void> {
  // 1. Désenregistrer le push token AVANT de perdre le token auth
  //    (best-effort : si ça échoue, le serveur nettoiera au prochain registerPushToken)
  try { await unregisterPushToken() } catch { /* best-effort */ }

  // 2. In-memory resets (synchrones, immédiats)
  resetProfile()
  invalidateWalletCache()
  resetNotificationBinding()
  clearUser()

  // 3. Async storage cleanup (parallele pour rapidité)
  await Promise.all([
    cacheClearAll(),
    clearProfileStorage(),
    resetAllNotifications(),
    clearQueue(),
    resetOnline(),
  ])

  // 4. Socket teardown en dernier (drop rooms + auth)
  resetSocket()
}
