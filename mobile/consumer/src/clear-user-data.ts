import { cacheClearAll } from './storage'
import { resetAllNotifications, resetNotificationBinding } from './notifications'
import { resetSocket } from './socket'

/**
 * Wipe ALL user-specific data (caches, notifications, socket).
 * Called on logout so the next user starts from a clean state.
 */
export async function clearAllUserData(): Promise<void> {
  // In-memory resets
  resetNotificationBinding()

  // Async storage cleanup
  await Promise.all([
    cacheClearAll(),
    resetAllNotifications(),
  ])

  // Recreate socket (drops old rooms/auth)
  resetSocket()
}
