import { connectMongoose } from './mongoose'
import PushToken from './models/PushToken'
import { addAppNotification, AppNotificationKind } from './notifications-memory'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, any>
  sound?: 'default' | null
  badge?: number
  channelId?: string
  appType?: 'consumer' | 'provider'
}

export interface PushResult {
  success: boolean
  tokenCount: number
  deliveredCount: number
  error?: string
}

interface ExpoPushReceipt {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string; fault?: string }
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string; fault?: string }
}

/**
 * Envoie un batch de messages à Expo Push et analyse les réponses.
 * Supprime immédiatement les tokens invalides (DeviceNotRegistered) et vérifie
 * les receipts asynchrones pour les tickets acceptés.
 * Retourne le nombre de tickets acceptés.
 */
async function sendExpoBatch(messages: Array<{ to: string;[key: string]: any }>): Promise<number> {
  if (!messages.length) return 0

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[Push] Expo HTTP ${res.status}: ${text.slice(0, 200)}`)
      return 0
    }

    const data = (await res.json().catch(() => null)) as { data?: ExpoPushTicket[] } | null
    const tickets = data?.data || []

    const tokensToRemove: string[] = []
    const ticketIds: string[] = []
    const tokenByTicketId = new Map<string, string>()
    let delivered = 0
    tickets.forEach((ticket, idx) => {
      const token = messages[idx]?.to
      if (ticket.status === 'ok') {
        delivered++
        if (ticket.id && token) {
          ticketIds.push(ticket.id)
          tokenByTicketId.set(ticket.id, token)
        }
        console.log(`[Push] ✅ token ${idx + 1}/${messages.length} accepté (ticket ${ticket.id})`)
      } else {
        const errorCode = ticket.details?.error
        console.warn(`[Push] ❌ token ${idx + 1}/${messages.length} erreur: ${ticket.message} (${errorCode})`)
        if (errorCode === 'DeviceNotRegistered' && token) {
          tokensToRemove.push(token)
        }
      }
    })

    if (tokensToRemove.length) {
      await PushToken.deleteMany({ token: { $in: tokensToRemove } })
      console.log(`[Push] 🗑️ ${tokensToRemove.length} token(s) invalide(s) supprimé(s)`)
    }
    // Vérifier les receipts pour nettoyer les tokens devenus invalides après envoi
    if (ticketIds.length) {
      void checkReceipts(ticketIds, tokenByTicketId)
    }
    return delivered
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[Push] Expo timeout (10s)')
    } else {
      console.error('[Push] Erreur envoi:', err.message)
    }
    return 0
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Accepte à la fois les tokens Expo (ExpoPushToken[...]) et les tokens natifs FCM
 * (longue chaîne alphanumérique) qui peuvent être retournés par les apps bare workflow.
 */
export function isValidPushToken(token: string): boolean {
  if (!token || typeof token !== 'string' || token.length > 400) return false
  if (token.startsWith('ExpoPushToken[') || token.startsWith('ExponentPushToken[')) return true
  // FCM native token (bare workflow / custom native builds)
  if (/^[A-Za-z0-9_-]{100,}$/.test(token)) return true
  // iOS native device token
  if (/^[a-f0-9]{64}$/i.test(token)) return true
  return false
}

/**
 * Vérifie les receipts Expo pour retirer les tokens invalides.
 * Fire-and-forget : ne bloque pas la réponse au client.
 */
async function checkReceipts(ticketIds: string[], tokenMap: Map<string, string>) {
  if (!ticketIds.length) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ ids: ticketIds }),
      signal: controller.signal,
    })
    if (!res.ok) return
    const data = (await res.json().catch(() => null)) as { data?: Record<string, ExpoPushReceipt> } | null
    const receipts = data?.data || {}
    const toRemove: string[] = []
    for (const [id, receipt] of Object.entries(receipts)) {
      if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
        const token = tokenMap.get(id)
        if (token) toRemove.push(token)
      }
    }
    if (toRemove.length) {
      await PushToken.deleteMany({ token: { $in: toRemove } })
      console.log(`[Push] 🗑️ ${toRemove.length} token(s) invalide(s) supprimé(s) via receipts`)
    }
  } catch (err: any) {
    console.warn('[Push] Receipt check failed:', err.message)
  } finally {
    clearTimeout(timer)
  }
}

function buildAppNotification(message: PushMessage, appType: 'consumer' | 'provider' | undefined) {
  const requestId = message.data?.requestId ? String(message.data.requestId) : ''
  const role = appType === 'provider' ? 'provider' : 'consumer'
  const link = (pathname: string, params?: Record<string, string>) => ({ pathname, params })

  switch (message.data?.type) {
    case 'offer:new':
      return {
        kind: 'offer-received' as AppNotificationKind,
        link: role === 'consumer' && requestId ? link('/request-offers', { id: requestId }) : undefined,
      }
    case 'offer:accepted':
    case 'payment:held':
      return {
        kind: 'request-assigned' as AppNotificationKind,
        link: requestId ? link(role === 'provider' ? `/active-mission/${requestId}` : `/mission/${requestId}`) : undefined,
      }
    case 'request:status-changed':
    case 'offer:counter-accepted':
    case 'offer:counter-rejected':
      return {
        kind: 'request-status-changed' as AppNotificationKind,
        link: requestId ? link(role === 'provider' ? `/active-mission/${requestId}` : `/mission/${requestId}`) : undefined,
      }
    case 'chat:message':
      return {
        kind: 'mission-update' as AppNotificationKind,
        link: requestId ? link('/mission-chat', { id: requestId }) : undefined,
      }
    case 'request:new':
      return { kind: 'request-new' as AppNotificationKind, link: role === 'provider' ? link('/nearby-requests') : undefined }
    case 'offer:rejected':
      return { kind: 'offer-rejected' as AppNotificationKind, link: role === 'provider' ? link('/my-offers') : undefined }
    case 'offer:counter':
      return { kind: 'offer-counter' as AppNotificationKind, link: role === 'provider' ? link('/my-offers') : undefined }
    default:
      return {
        kind: 'mission-update' as AppNotificationKind,
        link: requestId ? link(role === 'provider' ? `/active-mission/${requestId}` : `/mission/${requestId}`) : undefined,
      }
  }
}

/**
 * Envoie une push notification à tous les appareils d'un utilisateur.
 * Utilise l'API Expo Push (gratuit, pas de clé nécessaire pour Expo tokens).
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<PushResult> {
  try {
    await connectMongoose()
    const query: any = { userId }
    if (message.appType) query.appType = message.appType
    const tokens = await PushToken.find(query).select('token').lean()
    if (!tokens.length) {
      console.warn(`[Push] sendPushToUser(${userId}/${message.appType || 'any'}): aucun token enregistré`)
      return { success: false, tokenCount: 0, deliveredCount: 0, error: 'Aucun token enregistré pour cet utilisateur' }
    }
    console.log(`[Push] → user ${userId} (${message.appType || 'any'}): ${tokens.length} token(s) — "${message.title}"`)

    // Persist an in-app notification so it appears in the mobile notification tab even when
    // the push was received in the background or the local cache was cleared.
    try {
      const safeAppType: 'consumer' | 'provider' | undefined =
        message.appType === 'consumer' || message.appType === 'provider' ? message.appType : undefined
      const { kind, link } = buildAppNotification(message, safeAppType)
      addAppNotification(userId, kind, message.title, message.body, link, message.data)
    } catch (err) {
      console.warn('[Push] Failed to persist app notification:', err)
    }

    const messages = tokens.map((t: any) => ({
      to: t.token,
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: message.sound ?? 'default',
      badge: message.badge,
      channelId: message.channelId || 'default',
      priority: 'high',
    }))

    const chunks = chunkArray(messages, 100)
    let delivered = 0
    for (const chunk of chunks) delivered += await sendExpoBatch(chunk)
    return { success: delivered > 0, tokenCount: tokens.length, deliveredCount: delivered }
  } catch (err: any) {
    console.error('[Push] sendPushToUser error:', err)
    return { success: false, tokenCount: 0, deliveredCount: 0, error: err.message || 'Erreur envoi push' }
  }
}

/**
 * Envoie une push notification à plusieurs utilisateurs.
 */
export async function sendPushToUsers(userIds: string[], message: PushMessage): Promise<PushResult[]> {
  const results = await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, message)))
  return results.map(r => r.status === 'fulfilled' ? r.value : { success: false, tokenCount: 0, deliveredCount: 0, error: String(r.reason) })
}

/**
 * Envoie une push à tous les providers online (pour request:new).
 * Fallback : on envoie à TOUS les providers qui ont un token enregistré.
 */
export async function sendPushToAllProviders(message: PushMessage, excludeUserId?: string): Promise<PushResult> {
  try {
    await connectMongoose()
    const query: any = { appType: 'provider' }
    if (excludeUserId) query.userId = { $ne: excludeUserId }
    const tokens = await PushToken.find(query).select('token').lean()
    if (!tokens.length) {
      console.warn('[Push] sendPushToAllProviders: aucun token enregistré côté serveur. Le provider a-t-il bien accordé la permission ?')
      return { success: false, tokenCount: 0, deliveredCount: 0, error: 'Aucun token provider enregistré' }
    }
    console.log(`[Push] → broadcast ${tokens.length} provider(s) — "${message.title}"`)

    const messages = tokens.map((t: any) => ({
      to: t.token,
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: message.sound ?? 'default',
      channelId: message.channelId || 'services',
      priority: 'high',
    }))

    const chunks = chunkArray(messages, 100)
    let delivered = 0
    for (const chunk of chunks) delivered += await sendExpoBatch(chunk)
    return { success: delivered > 0, tokenCount: tokens.length, deliveredCount: delivered }
  } catch (err: any) {
    console.error('[Push] sendPushToAllProviders error:', err)
    return { success: false, tokenCount: 0, deliveredCount: 0, error: err.message || 'Erreur broadcast push' }
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
