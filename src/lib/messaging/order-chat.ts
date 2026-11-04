import { createHash, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { requireAuth, type JwtUser } from '@/lib/jwt'
import { requireAdminApi } from '@/lib/api-auth'
import { MARKET_BRAND } from '@/lib/branding'
import { emailService } from '@/lib/email-service'
import { escapeHtml } from '@/lib/html-escape'
import { sendWebPushToOrder } from '@/lib/push-web'
import { getIO } from '@/lib/socket-emit'
import { messageModelFor, toOrderMessageDto, type ThreadMessageDoc } from '@/lib/messaging/thread-messages'

const LEGACY_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000
// Pas plus d'un email par rafale de réponses du support
const EMAIL_THROTTLE_MS = 10 * 60 * 1000

function hashTrackingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function isTrackingTokenValid(order: any, token: string | null | undefined): boolean {
  if (!token || typeof order.trackingAccessTokenHash !== 'string') return false
  const expected = Buffer.from(order.trackingAccessTokenHash)
  const actual = Buffer.from(hashTrackingToken(token))
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false
  if (order.trackingAccessTokenExpiresAt) return new Date(order.trackingAccessTokenExpiresAt).getTime() > Date.now()
  return new Date(order.trackingAccessTokenCreatedAt).getTime() > Date.now() - LEGACY_TOKEN_TTL_MS
}

export type OrderChatAccess =
  | { ok: true; isAdmin: boolean; user: JwtUser | null; order: any }
  | { ok: false; status: number; error: string }

/** Admin, client propriétaire ou invité muni du lien de suivi. */
export async function resolveOrderChatAccess(
  req: NextRequest,
  orderReference: string,
  token: string | null | undefined
): Promise<OrderChatAccess> {
  const user: JwtUser | null = await requireAuth(req).catch(() => null)
  const isAdmin = (await requireAdminApi(req)).ok

  await connectDB()
  const order = await Order.findOne({ orderId: orderReference })
    .select('orderId clientId clientEmail clientName trackingAccessTokenHash trackingAccessTokenExpiresAt trackingAccessTokenCreatedAt')
    .lean() as any
  if (!order) return { ok: false, status: 404, error: 'Commande introuvable' }

  const isOwner = !!user && String(order.clientId) === String(user.userId)
  if (!isAdmin && !isOwner && !isTrackingTokenValid(order, token)) {
    return { ok: false, status: 403, error: 'Accès refusé' }
  }
  return { ok: true, isAdmin, user, order }
}

/** Le support voit les nouveaux messages client sans recharger son tableau de bord. */
export function notifyAdminsOfClientMessage(message: ThreadMessageDoc) {
  getIO()?.to('admins').emit('order-chat:new', toOrderMessageDto(message))
}

/** Prévient le client qu'il a une réponse : push web à chaque fois, email au plus toutes les 10 min. */
export async function notifyClientOfSupportReply(order: any, message: ThreadMessageDoc) {
  const orderId = String(order.orderId)
  const preview = (message.text || 'Pièce jointe').slice(0, 120)

  void sendWebPushToOrder(orderId, {
    title: `${MARKET_BRAND.name} - Réponse du support`,
    body: preview,
    url: `/commandes/${orderId}`,
    tag: `order-chat-${orderId}`,
  }).catch((err: unknown) => console.error('[order-chat] push error:', err))

  if (!order.clientEmail) return
  const recentReply = await messageModelFor('order').exists({
    threadType: 'order',
    threadId: orderId,
    senderRole: 'admin',
    _id: { $ne: message._id },
    createdAt: { $gte: new Date(new Date(message.createdAt).getTime() - EMAIL_THROTTLE_MS) },
  })
  if (recentReply) return

  const link = `${MARKET_BRAND.url}/commandes/${encodeURIComponent(orderId)}`
  void emailService.sendEmail({
    to: order.clientEmail,
    fromName: MARKET_BRAND.name,
    brand: MARKET_BRAND,
    subject: `Nouvelle réponse sur votre commande ${orderId}`,
    html: `<p>Bonjour ${escapeHtml(order.clientName || '')},</p>`
      + `<p>Notre équipe a répondu à votre message concernant la commande <strong>${escapeHtml(orderId)}</strong> :</p>`
      + `<blockquote style="border-left:3px solid #10b981;padding-left:12px;color:#374151">${escapeHtml(preview)}</blockquote>`
      + `<p><a href="${escapeHtml(link)}">Voir la conversation</a></p>`,
  }).catch((err: unknown) => console.error('[order-chat] email error:', err))
}
