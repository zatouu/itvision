import { cacheClearAll } from './storage'
import { clearProfileStorage, resetProfile } from './user-profile'
import { resetAllNotifications, resetNotificationBinding } from './notifications'
import { invalidateWalletCache } from './wallet'
import { resetSocket } from './socket'

/**
 * Wipe ALL user-specific data (caches, profile, notifications, wallet, socket).
 * Called on logout so the next user starts from a clean state.
 */
export async function clearAllUserData(): Promise<void> {
  // In-memory resets
  resetProfile()
  invalidateWalletCache()
  resetNotificationBinding()

  // Async storage cleanup
  await Promise.all([
    cacheClearAll(),
    clearProfileStorage(),
    resetAllNotifications(),
  ])

  // Recreate socket (drops old rooms/auth)
  resetSocket()
}
