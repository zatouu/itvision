export type InAppNotificationType = 'info' | 'success' | 'warning' | 'error'
export type AppRole = 'ADMIN' | 'TECHNICIAN' | 'CLIENT'

export interface InAppNotificationPayload {
  userId?: string
  roles?: AppRole[]
  teamId?: string
  type: InAppNotificationType
  title: string
  message: string
  actionUrl?: string
  metadata?: any
}

export async function sendInAppNotification(payload: InAppNotificationPayload): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json().catch(() => null)
    return Boolean(data && data.success)
  } catch {
    return false
  }
}
