import { connectMongoose } from './mongoose'
import PushToken from './models/PushToken'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  title: string
  body: string
  data?: Record<string, any>
  sound?: 'default' | null
  badge?: number
  channelId?: string
}

/**
 * Envoie une push notification à tous les appareils d'un utilisateur.
 * Utilise l'API Expo Push (gratuit, pas de clé nécessaire pour Expo tokens).
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  try {
    await connectMongoose()
    const tokens = await PushToken.find({ userId }).select('token').lean()
    if (!tokens.length) return

    const messages = tokens.map((t: any) => ({
      to: t.token,
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: message.sound ?? 'default',
      badge: message.badge,
      channelId: message.channelId || 'default',
    }))

    // Expo accepte des batches de 100 max
    const chunks = chunkArray(messages, 100)
    for (const chunk of chunks) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
        signal: controller.signal,
      }).catch(err => console.error('[Push] Erreur envoi:', err.message))
      .finally(() => clearTimeout(timer))
    }
  } catch (err) {
    console.error('[Push] sendPushToUser error:', err)
  }
}

/**
 * Envoie une push notification à plusieurs utilisateurs.
 */
export async function sendPushToUsers(userIds: string[], message: PushMessage): Promise<void> {
  // Paralléliser par user
  await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, message)))
}

/**
 * Envoie une push à tous les providers online (pour request:new).
 * On récupère tous les tokens de la room `providers-online` via les tokens stockés.
 * Fallback : on envoie à TOUS les providers qui ont un token enregistré.
 */
export async function sendPushToAllProviders(message: PushMessage, excludeUserId?: string): Promise<void> {
  try {
    await connectMongoose()
    const query: any = {}
    if (excludeUserId) query.userId = { $ne: excludeUserId }
    const tokens = await PushToken.find(query).select('token').lean()
    if (!tokens.length) return

    const messages = tokens.map((t: any) => ({
      to: t.token,
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: message.sound ?? 'default',
      channelId: message.channelId || 'services',
    }))

    const chunks = chunkArray(messages, 100)
    for (const chunk of chunks) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(chunk),
        signal: controller.signal,
      }).catch(err => console.error('[Push] Erreur broadcast:', err.message))
      .finally(() => clearTimeout(timer))
    }
  } catch (err) {
    console.error('[Push] sendPushToAllProviders error:', err)
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
