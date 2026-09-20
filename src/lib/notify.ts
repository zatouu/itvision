import { connectMongoose } from '@/lib/mongoose'
import InAppNotification from '@/lib/models/InAppNotification'
import { sendWebPushToUser } from '@/lib/push-web'

export type NotifyType = 'info' | 'success' | 'warning' | 'error'
export type NotifyRole = 'ADMIN' | 'SUPER_ADMIN' | 'VENDOR' | 'TECHNICIAN' | 'CLIENT' | 'PROVIDER'

export interface NotifyInput {
  userId?: string            // destinataire précis
  roles?: NotifyRole[]       // ou diffusion par rôle (ex: admins)
  type: NotifyType
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, any>
  push?: boolean             // tenter aussi un push web (défaut true si userId)
}

/**
 * Notification in-app persistée en Mongo + push web (PWA) si l'utilisateur
 * a souscrit. Jamais bloquant : les erreurs sont loggées, pas propagées.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await connectMongoose()
    await InAppNotification.create({
      userId: input.userId,
      roles: input.roles,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      metadata: input.metadata,
    })
  } catch (e) {
    console.error('[notify] persist failed:', e)
  }

  if (input.userId && input.push !== false) {
    try {
      await sendWebPushToUser(input.userId, {
        title: input.title,
        body: input.message,
        url: input.actionUrl || '/compte',
        tag: `ddm-${input.type}`,
      })
    } catch (e) {
      console.error('[notify] push failed:', e)
    }
  }
}

export function notifyUser(userId: string, input: Omit<NotifyInput, 'userId'>) {
  return notify({ ...input, userId })
}

export function notifyAdmins(input: Omit<NotifyInput, 'roles'>) {
  return notify({ ...input, roles: ['ADMIN', 'SUPER_ADMIN'] })
}
