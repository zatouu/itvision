import mongoose from 'mongoose'
import type { NextRequest } from 'next/server'
import User from '@/lib/models/User'
import AmbassadorCommission from '@/lib/models/AmbassadorCommission'
import { createUniqueReferralCode } from '@/lib/referral'
import { notifyUser } from '@/lib/notify'
import Product from '@/lib/models/Product'
import VendorProfile from '@/lib/models/VendorProfile'

/** Cookie posé par ReferralCapture quand un visiteur arrive par un lien ?ref=CODE (30 jours). */
export const AMBASSADOR_COOKIE = 'ddm_ref'

/** Taux de commission sur la valeur des produits (hors transport), borné à 20 %. */
export function ambassadorRate(): number {
  const raw = Number(process.env.AMBASSADOR_COMMISSION_RATE)
  return Number.isFinite(raw) && raw > 0 && raw <= 0.2 ? raw : 0.03
}

export function normalizeRefCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  return /^[A-Z0-9]{4,12}$/.test(code) ? code : null
}

const last9 = (phone?: string | null) => String(phone || '').replace(/\D/g, '').slice(-9)

export interface ReferralAttribution {
  code: string
  ambassadorUserId: mongoose.Types.ObjectId
}

/**
 * Ambassadeur à créditer pour cet achat : code du corps de requête, sinon cookie.
 * Auto-parrainage refusé (même compte ou même numéro).
 */
export async function resolveReferral(
  req: NextRequest,
  buyer: { userId?: string; phone?: string },
  bodyRef?: unknown
): Promise<ReferralAttribution | undefined> {
  const code = normalizeRefCode(bodyRef) || normalizeRefCode(req.cookies.get(AMBASSADOR_COOKIE)?.value)
  if (!code) return undefined
  const ambassador = await User.findOne({ referralCode: code }).select('_id phone').lean() as any
  if (!ambassador) return undefined
  if (buyer.userId && String(ambassador._id) === String(buyer.userId)) return undefined
  if (buyer.phone && ambassador.phone && last9(buyer.phone) === last9(ambassador.phone)) return undefined
  return { code, ambassadorUserId: ambassador._id }
}

/** Code ambassadeur de l'utilisateur, créé à la première demande. */
export async function ensureAmbassadorCode(userId: string): Promise<string> {
  const user = await User.findById(userId).select('referralCode').lean() as any
  if (user?.referralCode) return user.referralCode
  const code = await createUniqueReferralCode()
  const res = await User.updateOne({ _id: userId, referralCode: { $in: [null, ''] } }, { $set: { referralCode: code } })
  if (res.modifiedCount === 1) return code
  const again = await User.findById(userId).select('referralCode').lean() as any
  return again?.referralCode || code
}

async function createCommission(input: {
  referral: ReferralAttribution
  sourceType: 'order' | 'group'
  sourceId: string
  groupId?: string
  buyerName?: string
  label: string
  baseAmount: number
}) {
  const rate = ambassadorRate()
  const amount = Math.round(Math.max(0, input.baseAmount) * rate)
  if (amount <= 0) return
  const res = await AmbassadorCommission.updateOne(
    { sourceType: input.sourceType, sourceId: input.sourceId },
    {
      $setOnInsert: {
        ambassadorUserId: input.referral.ambassadorUserId,
        code: input.referral.code,
        groupId: input.groupId,
        buyerName: input.buyerName ? input.buyerName.split(/\s+/)[0] : undefined,
        label: input.label,
        baseAmount: Math.round(input.baseAmount),
        rate,
        amount,
        status: 'pending',
      },
    },
    { upsert: true }
  )
  if (res.upsertedCount === 1) {
    void notifyUser(String(input.referral.ambassadorUserId), {
      type: 'success',
      title: 'Vente grâce à votre lien',
      message: `${input.label} : +${amount.toLocaleString('fr-FR')} F de commission, validée à la livraison.`,
      actionUrl: '/compte/ambassadeur',
      metadata: { sourceType: input.sourceType, sourceId: input.sourceId, amount },
    })
  }
}

/** Commande payée : commission sur les produits, remises déduites, transport exclu, hors produits de sa propre boutique. */
export async function recordOrderCommission(order: any): Promise<void> {
  if (!order?.referral?.ambassadorUserId) return
  let base = Number(order.subtotal || 0) - Number(order.promoDiscount || 0) - Number(order.grainsDiscount || 0)
  const items: any[] = Array.isArray(order.items) ? order.items : []
  const vendor = await VendorProfile.findOne({ userId: order.referral.ambassadorUserId }).select('slug').lean() as any
  if (vendor?.slug && items.length > 0) {
    const ids = items.map(i => String(i.id)).filter(id => mongoose.isValidObjectId(id))
    const own = new Set((await Product.find({ _id: { $in: ids }, sellerSlug: vendor.slug }).select('_id').lean()).map((p: any) => String(p._id)))
    const lineTotal = (i: any) => (Number(i.price) || 0) * (Number(i.qty) || 1)
    const all = items.reduce((s, i) => s + lineTotal(i), 0)
    const mine = items.filter(i => own.has(String(i.id))).reduce((s, i) => s + lineTotal(i), 0)
    if (all > 0 && mine > 0) base = base * (1 - mine / all)
  }
  const first = order.items?.[0]?.name
  const label = first ? `${first}${order.items.length > 1 ? ` (+${order.items.length - 1})` : ''}` : `Commande ${order.orderId}`
  await createCommission({
    referral: order.referral,
    sourceType: 'order',
    sourceId: String(order.orderId),
    buyerName: order.clientName,
    label,
    baseAmount: base,
  })
}

/** Participant d'achat groupé entièrement payé. */
export async function recordGroupCommission(group: any, participant: any): Promise<void> {
  if (!participant?.referral?.ambassadorUserId) return
  const paid = Math.min(Number(participant.paidAmount || 0), Number(participant.totalAmount || 0))
  await createCommission({
    referral: participant.referral,
    sourceType: 'group',
    sourceId: `${group.groupId}:${participant._id}`,
    groupId: group.groupId,
    buyerName: participant.name,
    label: `Achat groupé ${group.product?.name || group.groupId} (${participant.qty} pcs)`,
    baseAmount: paid,
  })
}

/** Livraison → commission validée ; annulation ou remboursement → commission annulée (si pas déjà versée). */
export async function syncOrderCommission(orderId: string, event: 'delivered' | 'cancelled'): Promise<void> {
  await applyEvent({ sourceType: 'order', sourceId: String(orderId) }, event)
}

export async function syncGroupCommissions(groupId: string, event: 'delivered' | 'cancelled'): Promise<void> {
  await applyEvent({ sourceType: 'group', groupId }, event)
}

export async function cancelGroupParticipantCommission(groupId: string, participantId: string): Promise<void> {
  await applyEvent({ sourceType: 'group', sourceId: `${groupId}:${participantId}` }, 'cancelled')
}

/** Retour remboursé : commission réduite au prorata du montant rendu au client. */
export async function reduceOrderCommission(orderId: string, refundedRatio: number): Promise<void> {
  const ratio = Math.min(1, Math.max(0, refundedRatio))
  if (ratio <= 0) return
  const c = await AmbassadorCommission.findOne({ sourceType: 'order', sourceId: String(orderId), status: { $in: ['pending', 'validated'] } })
  if (!c) return
  const amount = Math.round(c.amount * (1 - ratio))
  if (amount <= 0) {
    c.status = 'cancelled'
    c.cancelledAt = new Date()
  } else {
    c.amount = amount
    c.baseAmount = Math.round(c.baseAmount * (1 - ratio))
  }
  await c.save()
}

async function applyEvent(filter: Record<string, unknown>, event: 'delivered' | 'cancelled') {
  const now = new Date()
  if (event === 'delivered') {
    await AmbassadorCommission.updateMany(
      { ...filter, status: 'pending' },
      { $set: { status: 'validated', validatedAt: now } }
    )
  } else {
    await AmbassadorCommission.updateMany(
      { ...filter, status: { $in: ['pending', 'validated'] } },
      { $set: { status: 'cancelled', cancelledAt: now } }
    )
  }
}

/** Seuil minimal de demande de versement (FCFA). */
export const AMBASSADOR_MIN_PAYOUT = Number(process.env.AMBASSADOR_MIN_PAYOUT) > 0 ? Number(process.env.AMBASSADOR_MIN_PAYOUT) : 2000
