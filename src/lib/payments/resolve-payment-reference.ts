/**
 * Résolution des références de paiement marketplace.
 *
 * Deux familles de références :
 * - `AG-…` : participant à un achat groupé (`participants.paymentReference`).
 *   Le lien de paiement est envoyé par email au participant : la référence joue
 *   le rôle de capacité (pay-by-link). Les données retournées sont masquées.
 * - `CMD-…` : commande standard (`Order.orderId`). Accès restreint au client
 *   propriétaire (session) ou au détenteur du tracking token invité.
 *
 * Utilisé par : /paiement/checkout/[reference] (page), /api/payment/resolve,
 * /api/payment/checkout/init.
 */

import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { GroupOrder, type IGroupOrderParticipant } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'

export function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ─── Masquage PII ─────────────────────────────────────────────────────────────

/** "Amadou Diallo" → "Amadou D." — affichage public sans exposer l'identité. */
export function maskName(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Participant'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

/** "+221 77 123 45 67" → "+221 77 ••• •• 67" */
export function maskPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 5) return '•••••'
  const prefix = digits.startsWith('221') ? `+221 ${digits.slice(3, 5)}` : `+${digits.slice(0, 3)}`
  return `${prefix} ••• •• ${digits.slice(-2)}`
}

// ─── Résolution ───────────────────────────────────────────────────────────────

export interface PaymentItemView {
  name: string
  qty: number
  price: number
  image?: string
  variant?: string
}

export interface ResolvedGroupPayment {
  type: 'group'
  reference: string
  amount: number
  currency: 'FCFA'
  paymentStatus: string
  participant: {
    name: string
    phone: string
    email?: string
    qty: number
    unitPrice: number
    userId?: string
  }
  group: {
    groupId: string
    productName: string
    productImage?: string
    status: string
    deadline?: Date
  }
  /** Transport au poids réel (TR-…) : libellé de paiement et page de retour */
  description?: string
  backHref?: string
}

export interface ResolvedOrderPayment {
  type: 'order'
  reference: string // orderId
  amount: number
  currency: 'FCFA'
  paymentStatus: string
  order: {
    orderId: string
    status?: string
    clientId?: string
    clientName: string
    clientPhone: string
    clientEmail?: string
    createdAt?: Date
    items: PaymentItemView[]
    trackingAccessTokenHash?: string
    trackingAccessTokenExpiresAt?: Date
  }
}

export type ResolvedPayment = ResolvedGroupPayment | ResolvedOrderPayment

/** Lookup DB uniquement — le contrôle d'accès reste à la charge de l'appelant. */
export async function resolvePaymentReference(reference: string): Promise<ResolvedPayment | null> {
  if (!reference || typeof reference !== 'string') return null

  await connectDB()

  // 0. Transport facturé au poids réel (pay-by-link, comme les achats groupés)
  if (reference.startsWith('TR-')) return resolveTransportReference(reference)

  // 1. Participant d'achat groupé
  const groupOrder = await GroupOrder.findOne({
    'participants.paymentReference': reference,
  }).lean()

  if (groupOrder) {
    const participant = (groupOrder.participants as IGroupOrderParticipant[]).find(
      (p) => p.paymentReference === reference
    )
    if (participant) {
      const amount =
        participant.totalAmount ||
        participant.qty * (participant.unitPrice || groupOrder.currentUnitPrice || groupOrder.product.basePrice)
      return {
        type: 'group',
        reference,
        amount: Math.round(amount),
        currency: 'FCFA',
        paymentStatus: participant.paymentStatus || 'pending',
        participant: {
          name: participant.name,
          phone: participant.phone,
          email: participant.email,
          qty: participant.qty,
          unitPrice: participant.unitPrice,
          userId: participant.userId ? String(participant.userId) : undefined,
        },
        group: {
          groupId: groupOrder.groupId,
          productName: groupOrder.product?.name || 'Achat groupé',
          productImage: groupOrder.product?.image,
          status: groupOrder.status,
          deadline: groupOrder.deadline,
        },
      }
    }
  }

  // 2. Commande standard
  const order = (await Order.findOne({ orderId: reference }).lean()) as any
  if (!order) return null

  const items: PaymentItemView[] = ((order as any).items || []).map((it: any) => ({
    name: it.name || it.productName || 'Article',
    qty: it.qty || it.quantity || 1,
    price: it.price || 0,
    image: it.image,
    variant: Array.isArray(it.variantLabels) ? it.variantLabels.join(' · ') : it.variant,
  }))

  return {
    type: 'order',
    reference: order.orderId,
    amount: order.total || 0,
    currency: 'FCFA',
    paymentStatus: (order as any).paymentStatus || 'pending',
    order: {
      orderId: order.orderId,
      status: (order as any).status,
      clientId: (order as any).clientId ? String((order as any).clientId) : undefined,
      clientName: (order as any).clientName || 'Client',
      clientPhone: (order as any).clientPhone || '',
      clientEmail: (order as any).clientEmail,
      createdAt: (order as any).createdAt,
      items,
      trackingAccessTokenHash: (order as any).trackingAccessTokenHash,
      trackingAccessTokenExpiresAt: (order as any).trackingAccessTokenExpiresAt,
    },
  }
}

async function resolveTransportReference(reference: string): Promise<ResolvedGroupPayment | null> {
  const group = await GroupOrder.findOne({ 'participants.transport.paymentReference': reference }).lean() as any
  if (group) {
    const p = (group.participants || []).find((x: any) => x.transport?.paymentReference === reference)
    if (!p) return null
    return {
      type: 'group',
      reference,
      amount: Math.round(p.transport.amount || 0),
      currency: 'FCFA',
      paymentStatus: p.transport.paymentStatus === 'paid' ? 'paid' : 'pending',
      participant: { name: p.name, phone: p.phone, email: p.email, qty: 1, unitPrice: Math.round(p.transport.amount || 0), userId: p.userId ? String(p.userId) : undefined },
      group: {
        groupId: group.groupId,
        productName: `Transport au poids réel · ${group.product?.name || 'achat groupé'} (${p.qty} pcs)`,
        productImage: group.product?.image,
        status: group.status === 'cancelled' ? 'cancelled' : 'ordered',
        deadline: group.deadline,
      },
      description: `Transport achat groupé #${group.groupId} (${p.qty} pcs)`,
      backHref: `/achats-groupes/${encodeURIComponent(group.groupId)}`,
    }
  }

  const order = await Order.findOne({ 'shippingAdjustment.paymentReference': reference }).lean() as any
  const adj = order?.shippingAdjustment
  if (!order || !adj) return null
  return {
    type: 'group',
    reference,
    amount: Math.round(adj.amount || 0),
    currency: 'FCFA',
    paymentStatus: adj.status === 'paid' ? 'paid' : 'pending',
    participant: { name: order.clientName, phone: order.clientPhone, email: order.clientEmail, qty: 1, unitPrice: Math.round(adj.amount || 0), userId: order.clientId ? String(order.clientId) : undefined },
    group: {
      groupId: order.orderId,
      productName: `Complément transport au poids réel · commande ${order.orderId}`,
      status: order.status === 'cancelled' ? 'cancelled' : 'ordered',
    },
    description: `Complément transport commande #${order.orderId}`,
    backHref: `/commandes/${encodeURIComponent(order.orderId)}`,
  }
}

/**
 * Contrôle d'accès pour une commande standard :
 * propriétaire authentifié OU tracking token invité valide (non expiré).
 */
export function canAccessOrderPayment(
  resolved: ResolvedOrderPayment,
  opts: { userId?: string | null; token?: string | null }
): boolean {
  if (opts.userId && resolved.order.clientId && String(resolved.order.clientId) === String(opts.userId)) {
    return true
  }
  const token = opts.token
  if (token && resolved.order.trackingAccessTokenHash) {
    const notExpired =
      !resolved.order.trackingAccessTokenExpiresAt ||
      new Date(resolved.order.trackingAccessTokenExpiresAt) > new Date()
    if (notExpired && resolved.order.trackingAccessTokenHash === hashTrackingToken(token)) {
      return true
    }
  }
  return false
}

export function isPaymentSettled(resolved: ResolvedPayment): boolean {
  return resolved.paymentStatus === 'paid' || resolved.paymentStatus === 'completed'
}
