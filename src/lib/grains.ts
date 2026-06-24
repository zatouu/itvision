import mongoose from 'mongoose'
import GrainsTransaction from '@/lib/models/GrainsTransaction'
import Activity from '@/lib/models/Activity'
import User from '@/lib/models/User'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'

export const GRAINS_RULES = {
  ORDER: { ratePerFcfa: 1 / 1000, min: 1, max: 5000, description: (amount: number) => `Grains gagnés sur commande de ${amount.toLocaleString('fr-FR')} FCFA` },
  GROUP_JOIN: { amount: 25, description: 'Grains gagnés en rejoignant un achat groupé' },
  GROUP_COMPLETE: { amount: 100, description: 'Grains gagnés sur achat groupé complété' },
  REVIEW: { amount: 50, description: 'Grains gagnés en publiant un avis' },
  REFERRAL_SIGNUP: { amount: 100, description: 'Grains gagnés grâce à un filleul inscrit' },
  REFERRAL_FIRST_ORDER: { amount: 500, description: 'Grains gagnés grâce à la première commande d\'un filleul' },
  FAVORITE: { amount: 5, description: 'Grains gagnés en ajoutant un favori' },
  BIRTHDAY: { amount: 200, description: 'Grains d\'anniversaire' },
} as const

// Anti-abuse caps
const DAILY_CAPS: Record<string, number> = {
  favorite: 30,      // 6 favoris max/jour
  review: 50,        // 1 avis max/jour
  group_join: 50,    // 2 groupes/jour
  referral: 100,     // 1 inscription filleul/jour
  order: 5000,       // plafond commande/jour
}

const MONTHLY_CAPS: Record<string, number> = {
  favorite: 150,     // 30 favoris max/mois
  review: 300,       // 6 avis max/mois
  group_join: 300,   // 12 groupes/mois
  referral: 500,     // 5 filleuls/mois
  order: 20000,       // plafond commande/mois
}

const MAX_BALANCE = 25_000

function toObjectId(userId: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId
}

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function getGrainsBalance(userId: string | mongoose.Types.ObjectId) {
  const uid = toObjectId(userId)
  const result = await GrainsTransaction.aggregate([
    { $match: { userId: uid, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] } },
    { $group: { _id: null, balance: { $sum: '$amount' } } },
  ])
  return Math.max(0, Math.round(result[0]?.balance || 0))
}

async function amountEarnedInWindow(userId: string | mongoose.Types.ObjectId, source: string, since: Date) {
  const uid = toObjectId(userId)
  const result = await GrainsTransaction.aggregate([
    { $match: { userId: uid, source, amount: { $gt: 0 }, createdAt: { $gte: since } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return Math.round(result[0]?.total || 0)
}

async function isUnderCaps(userId: string | mongoose.Types.ObjectId, source: string, amount: number) {
  const [daily, monthly, balance] = await Promise.all([
    amountEarnedInWindow(userId, source, startOfDay()),
    amountEarnedInWindow(userId, source, startOfMonth()),
    getGrainsBalance(userId),
  ])

  if (balance + amount > MAX_BALANCE) {
    console.warn(`[grains] Cap solde atteint pour user ${userId}: ${balance} + ${amount} > ${MAX_BALANCE}`)
    return false
  }

  const dailyCap = DAILY_CAPS[source]
  if (dailyCap !== undefined && daily + amount > dailyCap) {
    console.warn(`[grains] Cap journalier atteint pour user ${userId} source ${source}: ${daily} + ${amount} > ${dailyCap}`)
    return false
  }

  const monthlyCap = MONTHLY_CAPS[source]
  if (monthlyCap !== undefined && monthly + amount > monthlyCap) {
    console.warn(`[grains] Cap mensuel atteint pour user ${userId} source ${source}: ${monthly} + ${amount} > ${monthlyCap}`)
    return false
  }

  return true
}

interface GrainEvent {
  userId: string | mongoose.Types.ObjectId
  amount: number
  type: 'earned' | 'spent' | 'bonus' | 'expired'
  source: 'order' | 'group_join' | 'group_complete' | 'referral' | 'review' | 'redemption' | 'admin' | 'birthday' | 'favorite'
  sourceId?: string | mongoose.Types.ObjectId
  description: string
  metadata?: Record<string, unknown>
}

export async function createGrainsEvent({
  userId,
  amount,
  type,
  source,
  sourceId,
  description,
  metadata,
}: GrainEvent) {
  if (!userId || amount <= 0) return null
  const uid = toObjectId(userId)

  // Block if user would exceed daily/monthly/max balance caps
  if (!(await isUnderCaps(uid, source, amount))) return null

  try {
    const tx = await GrainsTransaction.create({
      userId: uid,
      amount,
      type,
      source,
      sourceId: sourceId ? (typeof sourceId === 'string' ? new mongoose.Types.ObjectId(sourceId) : sourceId) : undefined,
      description,
    })

    await Activity.create({
      userId: uid,
      type: type === 'earned' ? 'grains_earned' : type === 'spent' ? 'reward_redeemed' : 'grains_earned',
      description,
      amount: Math.abs(amount),
      unit: 'grains',
      metadata: metadata || {},
    })

    return tx
  } catch (err) {
    console.error('[grains] createGrainsEvent error:', err)
    return null
  }
}

export async function creditGrainsForOrder(userId: string | mongoose.Types.ObjectId, orderId: string, totalFcfa: number) {
  const uid = toObjectId(userId)
  const rule = GRAINS_RULES.ORDER

  // Only credit once per order
  const alreadyGranted = await GrainsTransaction.exists({
    userId: uid,
    source: 'order',
    sourceId: orderId,
    amount: { $gt: 0 },
  })
  if (alreadyGranted) return null

  const amount = Math.max(rule.min, Math.min(rule.max, Math.round(totalFcfa * rule.ratePerFcfa)))
  return createGrainsEvent({
    userId: uid,
    amount,
    type: 'earned',
    source: 'order',
    sourceId: orderId,
    description: rule.description(totalFcfa),
    metadata: { orderId, totalFcfa },
  })
}

// Safe variant: checks order status before crediting.
export async function maybeCreditGrainsForOrder(userId: string | mongoose.Types.ObjectId, orderId: string, totalFcfa: number) {
  const order = await Order.findById(orderId).lean() as any
  if (!order) return null

  // Only count confirmed/paid orders, not pending or cancelled
  const validStatuses = ['pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered']
  if (!validStatuses.includes(order.status)) return null

  return creditGrainsForOrder(userId, orderId, totalFcfa)
}

export async function creditGrainsForGroupJoin(userId: string | mongoose.Types.ObjectId, groupId: string) {
  const uid = toObjectId(userId)

  // One reward per user per group
  const alreadyGranted = await GrainsTransaction.exists({
    userId: uid,
    source: 'group_join',
    sourceId: groupId,
    amount: { $gt: 0 },
  })
  if (alreadyGranted) return null

  // Ensure group is open or filled (not cancelled/expired)
  const group = await GroupOrder.findOne({ groupId }).lean() as any
  if (!group || ['cancelled', 'expired'].includes(group.status)) return null

  return createGrainsEvent({
    userId: uid,
    amount: GRAINS_RULES.GROUP_JOIN.amount,
    type: 'earned',
    source: 'group_join',
    sourceId: groupId,
    description: GRAINS_RULES.GROUP_JOIN.description,
    metadata: { groupId },
  })
}

export async function creditGrainsForGroupComplete(userId: string | mongoose.Types.ObjectId, groupId: string) {
  const uid = toObjectId(userId)

  const alreadyGranted = await GrainsTransaction.exists({
    userId: uid,
    source: 'group_complete',
    sourceId: groupId,
    amount: { $gt: 0 },
  })
  if (alreadyGranted) return null

  // Ensure group is actually filled/complete
  const group = await GroupOrder.findOne({ groupId }).lean() as any
  if (!group || !['filled', 'ordering', 'ordered', 'shipped', 'delivered'].includes(group.status)) return null

  return createGrainsEvent({
    userId: uid,
    amount: GRAINS_RULES.GROUP_COMPLETE.amount,
    type: 'earned',
    source: 'group_complete',
    sourceId: groupId,
    description: GRAINS_RULES.GROUP_COMPLETE.description,
    metadata: { groupId },
  })
}

export async function creditGroupCompleteToParticipants(group: any) {
  if (!group || !Array.isArray(group.participants)) return
  for (const participant of group.participants) {
    if (!participant.userId) continue
    try {
      await creditGrainsForGroupComplete(participant.userId, group.groupId)
    } catch (err) {
      console.error('[grains] group complete participant error:', err)
    }
  }
}

export async function creditGrainsForReview(userId: string | mongoose.Types.ObjectId, reviewId: string, requestId: string) {
  const uid = toObjectId(userId)

  const alreadyGranted = await GrainsTransaction.exists({
    userId: uid,
    source: 'review',
    sourceId: reviewId,
    amount: { $gt: 0 },
  })
  if (alreadyGranted) return null

  return createGrainsEvent({
    userId: uid,
    amount: GRAINS_RULES.REVIEW.amount,
    type: 'earned',
    source: 'review',
    sourceId: reviewId,
    description: GRAINS_RULES.REVIEW.description,
    metadata: { reviewId, requestId },
  })
}

export async function creditGrainsForFavorite(userId: string | mongoose.Types.ObjectId, productId: string) {
  const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId
  const alreadyGranted = await GrainsTransaction.exists({
    userId: uid,
    source: 'favorite',
    sourceId: productId,
    amount: GRAINS_RULES.FAVORITE.amount,
  })
  if (alreadyGranted) return null

  return createGrainsEvent({
    userId,
    amount: GRAINS_RULES.FAVORITE.amount,
    type: 'earned',
    source: 'favorite',
    sourceId: productId,
    description: GRAINS_RULES.FAVORITE.description,
    metadata: { productId },
  })
}

export async function creditGrainsForReferralSignup(referrerUserId: string | mongoose.Types.ObjectId, referralCode: string, newUserId: string) {
  const uid = toObjectId(referrerUserId)

  const alreadyGranted = await GrainsTransaction.exists({
    userId: uid,
    source: 'referral',
    sourceId: newUserId,
    amount: GRAINS_RULES.REFERRAL_SIGNUP.amount,
  })
  if (alreadyGranted) return null

  return createGrainsEvent({
    userId: uid,
    amount: GRAINS_RULES.REFERRAL_SIGNUP.amount,
    type: 'earned',
    source: 'referral',
    sourceId: newUserId,
    description: GRAINS_RULES.REFERRAL_SIGNUP.description,
    metadata: { referralCode, newUserId },
  })
}

export async function creditGrainsForReferralFirstOrder(referrerUserId: string | mongoose.Types.ObjectId, newUserId: string, orderId: string) {
  const uid = toObjectId(referrerUserId)

  const alreadyGranted = await GrainsTransaction.exists({
    userId: uid,
    source: 'referral',
    'metadata.newUserId': newUserId,
    amount: GRAINS_RULES.REFERRAL_FIRST_ORDER.amount,
  })
  if (alreadyGranted) return null

  // Validate the referred order exists and is not cancelled
  const order = await Order.findById(orderId).lean() as any
  if (!order || order.status === 'cancelled' || order.status === 'refunded') return null

  return createGrainsEvent({
    userId: uid,
    amount: GRAINS_RULES.REFERRAL_FIRST_ORDER.amount,
    type: 'earned',
    source: 'referral',
    sourceId: orderId,
    description: GRAINS_RULES.REFERRAL_FIRST_ORDER.description,
    metadata: { newUserId, orderId },
  })
}

export async function recordReferralFirstOrder(referredUserId: string | mongoose.Types.ObjectId, orderId: string) {
  const user = await User.findById(referredUserId).lean() as any
  if (!user || !user.referredBy) return null

  const referrer = await User.findOne({ referralCode: user.referredBy }).lean() as any
  if (!referrer) return null

  return creditGrainsForReferralFirstOrder(referrer._id, String(referredUserId), orderId)
}

export async function creditBirthdayGrains(userId: string | mongoose.Types.ObjectId) {
  const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId
  const today = new Date()
  const year = today.getFullYear()

  // Check if already credited this year
  const already = await GrainsTransaction.exists({
    userId: uid,
    source: 'birthday',
    description: /anniversaire/,
    createdAt: { $gte: new Date(`${year}-01-01`) },
  })
  if (already) return null

  return createGrainsEvent({
    userId: uid,
    amount: GRAINS_RULES.BIRTHDAY.amount,
    type: 'bonus',
    source: 'birthday',
    description: GRAINS_RULES.BIRTHDAY.description,
  })
}

export async function reverseGrainsForOrder(userId: string | mongoose.Types.ObjectId, orderId: string, reason: string) {
  const uid = toObjectId(userId)
  const existing = await GrainsTransaction.findOne({
    userId: uid,
    source: 'order',
    sourceId: orderId,
    amount: { $gt: 0 },
  }).lean() as any
  if (!existing) return null

  // Prevent duplicate reversal
  const alreadyReversed = await GrainsTransaction.exists({
    userId: uid,
    source: 'order',
    sourceId: orderId,
    amount: { $lt: 0 },
  })
  if (alreadyReversed) return null

  return createGrainsEvent({
    userId: uid,
    amount: -existing.amount,
    type: 'expired',
    source: 'order',
    sourceId: orderId,
    description: `Grains annulés suite à ${reason}`,
    metadata: { orderId, originalAmount: existing.amount, reason },
  })
}

export async function updateTierFromBalance(userId: string | mongoose.Types.ObjectId) {
  const uid = toObjectId(userId)
  const balance = await getGrainsBalance(uid)

  const tier = balance >= 5000 ? 'Platine' : balance >= 2000 ? 'Or' : balance >= 500 ? 'Argent' : 'Bronze'
  await User.updateOne({ _id: uid }, { $set: { tier } })
  return tier
}
