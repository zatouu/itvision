import webPush from 'web-push'
import { connectMongoose } from './mongoose'
import PushSubscription from './models/PushSubscription'

export interface WebPushMessage {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string; icon?: string }>
}

const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || ''
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY || ''
const email = process.env.WEB_PUSH_EMAIL || 'support@itvisionplus.sn'

function configure() {
  if (publicKey && privateKey) {
    webPush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)
  }
}

function buildPayload(message: WebPushMessage) {
  return JSON.stringify({
    title: message.title,
    body: message.body,
    icon: message.icon || '/android-chrome-192x192.png',
    badge: message.badge || '/android-chrome-192x192.png',
    url: message.url || '/',
    tag: message.tag || message.url || 'ddm-push',
    requireInteraction: message.requireInteraction,
    actions: message.actions || [],
  })
}

export async function sendWebPushToSubscription(subscription: any, message: WebPushMessage) {
  configure()
  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID keys not configured')
    return { success: false, error: 'VAPID keys not configured' }
  }
  try {
    await webPush.sendNotification(subscription, buildPayload(message))
    return { success: true }
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Subscription expired or invalid
      try {
        await PushSubscription.deleteOne({ endpoint: subscription.endpoint })
      } catch {}
    }
    console.error('[WebPush] sendNotification error:', err.statusCode, err.message || err.body)
    return { success: false, error: err.message }
  }
}

export async function sendWebPushToUser(userId: string, message: WebPushMessage) {
  try {
    await connectMongoose()
    const subs = await PushSubscription.find({ userId }).lean()
    if (!subs.length) return { success: false, delivered: 0, total: 0, error: 'No web subscriptions for user' }

    let delivered = 0
    for (const s of subs as any[]) {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
      const r = await sendWebPushToSubscription(sub, message)
      if (r.success) delivered++
    }
    return { success: delivered > 0, delivered, total: subs.length }
  } catch (err: any) {
    console.error('[WebPush] sendWebPushToUser error:', err)
    return { success: false, delivered: 0, total: 0, error: err.message }
  }
}

export async function sendWebPushToOrder(orderId: string, message: WebPushMessage) {
  try {
    await connectMongoose()
    const subs = await PushSubscription.find({ $or: [{ orderId }, { userId: { $exists: false } }] }).lean()
    // Also include subscriptions linked to the order via phone? We'll rely on orderId for guest subs.
    if (!subs.length) return { success: false, delivered: 0, total: 0, error: 'No web subscriptions for order' }

    let delivered = 0
    for (const s of subs as any[]) {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
      const r = await sendWebPushToSubscription(sub, message)
      if (r.success) delivered++
    }
    return { success: delivered > 0, delivered, total: subs.length }
  } catch (err: any) {
    console.error('[WebPush] sendWebPushToOrder error:', err)
    return { success: false, delivered: 0, total: 0, error: err.message }
  }
}

export { publicKey, privateKey, email }
