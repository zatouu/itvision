/** GET /api/admin/market/funnel?days=7|30|90 — tunnel DDM+ (visites → groupes → paiements), ambassadeurs et revendeurs. */
import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import PageVisit from '@/lib/models/PageVisit'
import { GroupOrder } from '@/lib/models/GroupOrder'
import GroupInterest from '@/lib/models/GroupInterest'
import { Order } from '@/lib/models/Order'
import Payment from '@/lib/models/Payment'
import AmbassadorCommission from '@/lib/models/AmbassadorCommission'
import ResellerPreorder from '@/lib/models/ResellerPreorder'
import User from '@/lib/models/User'

const PERIODS = [7, 30, 90]
const MARKET_PATH = /^\/(market|produits|achats-groupes|boutiques|panier|checkout|precommande)(\/|$)/
const FILLED = ['filled', 'ordering', 'ordered', 'shipped', 'delivered']

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const requested = Number(new URL(request.url).searchParams.get('days'))
  const days = PERIODS.includes(requested) ? requested : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  await connectMongoose()

  const [visitsAgg, joinsAgg, groupsAgg, interests, ordersAgg, paymentsAgg, ambassadorsAgg, resellersAgg, topGroupsAgg] = await Promise.all([
    // Un visiteur compte une fois par étape ; visites anciennes sans identifiant : IP + navigateur
    PageVisit.aggregate([
      { $match: { visitedAt: { $gte: since }, pageType: 'public', path: MARKET_PATH } },
      { $group: {
        _id: { $ifNull: ['$sessionId', { $concat: [{ $ifNull: ['$ipAddress', ''] }, '|', { $ifNull: ['$userAgent', ''] }] }] },
        group: { $max: { $cond: [{ $regexMatch: { input: '$path', regex: '^/achats-groupes' } }, 1, 0] } },
        checkout: { $max: { $cond: [{ $regexMatch: { input: '$path', regex: '^/(checkout|panier)' } }, 1, 0] } },
        mobile: { $max: { $cond: [{ $eq: ['$deviceType', 'mobile'] }, 1, 0] } },
      } },
      { $group: { _id: null, sessions: { $sum: 1 }, groupSessions: { $sum: '$group' }, checkoutSessions: { $sum: '$checkout' }, mobileSessions: { $sum: '$mobile' } } },
    ]),

    GroupOrder.aggregate([
      { $match: { 'participants.joinedAt': { $gte: since } } },
      { $unwind: '$participants' },
      { $match: { 'participants.joinedAt': { $gte: since } } },
      { $group: {
        _id: null,
        joins: { $sum: 1 },
        paid: { $sum: { $cond: [{ $in: ['$participants.paymentStatus', ['paid', 'partial']] }, 1, 0] } },
        paidAmount: { $sum: { $cond: [{ $in: ['$participants.paymentStatus', ['paid', 'partial']] }, { $ifNull: ['$participants.paidAmount', 0] }, 0] } },
        viaAmbassador: { $sum: { $cond: [{ $ifNull: ['$participants.referral.code', false] }, 1, 0] } },
        viaReseller: { $sum: { $cond: [{ $ifNull: ['$participants.resaleProductId', false] }, 1, 0] } },
      } },
    ]),

    GroupOrder.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'draft' } } },
      { $group: {
        _id: null,
        created: { $sum: 1 },
        filled: { $sum: { $cond: [{ $in: ['$status', FILLED] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
      } },
    ]),

    GroupInterest.countDocuments({ createdAt: { $gte: since } }),

    Order.aggregate([
      { $match: { createdAt: { $gte: since }, $or: [{ domain: 'marketplace' }, { domain: { $exists: false } }, { domain: null }] } },
      { $group: {
        _id: null,
        created: { $sum: 1 },
        paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] } },
        paidAmount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, '$total', 0] } },
        viaAmbassador: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentStatus', 'completed'] }, { $ifNull: ['$referral.code', false] }] }, 1, 0] } },
      } },
    ]),

    Payment.aggregate([
      { $match: { createdAt: { $gte: since }, domain: { $in: ['marketplace', 'group'] }, status: { $in: ['held', 'released'] } } },
      { $group: { _id: '$domain', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),

    AmbassadorCommission.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$ambassadorUserId', code: { $first: '$code' }, sales: { $sum: 1 }, revenue: { $sum: '$baseAmount' }, commission: { $sum: '$amount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),

    ResellerPreorder.aggregate([
      { $match: { 'reservations.createdAt': { $gte: since } } },
      { $unwind: '$reservations' },
      { $match: { 'reservations.createdAt': { $gte: since }, 'reservations.status': { $ne: 'cancelled' } } },
      { $group: {
        _id: '$ownerUserId',
        name: { $first: '$ownerName' },
        shopSlug: { $first: '$shopSlug' },
        reservations: { $sum: 1 },
        confirmed: { $sum: { $cond: [{ $eq: ['$reservations.status', 'confirmed'] }, 1, 0] } },
        qty: { $sum: '$reservations.qty' },
        amount: { $sum: { $multiply: ['$reservations.qty', '$resalePrice'] } },
      } },
      { $sort: { amount: -1 } },
      { $limit: 10 },
    ]),

    GroupOrder.aggregate([
      { $match: { 'participants.joinedAt': { $gte: since } } },
      { $project: {
        groupId: 1, status: 1, minQty: 1, currentQty: 1, deadline: 1, name: '$product.name',
        joins: { $size: { $filter: { input: '$participants', as: 'p', cond: { $gte: ['$$p.joinedAt', since] } } } },
        paid: { $size: { $filter: { input: '$participants', as: 'p', cond: { $and: [{ $gte: ['$$p.joinedAt', since] }, { $in: ['$$p.paymentStatus', ['paid', 'partial']] }] } } } },
      } },
      { $sort: { joins: -1 } },
      { $limit: 8 },
    ]),
  ])

  const users = await User.find({ _id: { $in: ambassadorsAgg.map((a: any) => a._id) } }).select('name').lean() as any[]
  const names = new Map(users.map(u => [String(u._id), u.name]))

  const v = visitsAgg[0] || {}
  const j = joinsAgg[0] || {}
  const g = groupsAgg[0] || {}
  const o = ordersAgg[0] || {}
  const pay = Object.fromEntries((paymentsAgg as any[]).map(p => [p._id, { amount: Math.round(p.amount), count: p.count }]))

  return NextResponse.json({
    success: true,
    days,
    since,
    funnel: {
      sessions: v.sessions || 0,
      mobileSessions: v.mobileSessions || 0,
      groupSessions: v.groupSessions || 0,
      checkoutSessions: v.checkoutSessions || 0,
      interests,
      joins: j.joins || 0,
      paidParticipants: j.paid || 0,
    },
    groups: {
      created: g.created || 0,
      filled: g.filled || 0,
      cancelled: g.cancelled || 0,
      open: g.open || 0,
      paidAmount: Math.round(j.paidAmount || 0),
      viaAmbassador: j.viaAmbassador || 0,
      viaReseller: j.viaReseller || 0,
    },
    orders: {
      created: o.created || 0,
      paid: o.paid || 0,
      paidAmount: Math.round(o.paidAmount || 0),
      viaAmbassador: o.viaAmbassador || 0,
    },
    payments: {
      marketplace: pay.marketplace || { amount: 0, count: 0 },
      group: pay.group || { amount: 0, count: 0 },
    },
    ambassadors: ambassadorsAgg.map((a: any) => ({
      ambassadorUserId: String(a._id),
      name: names.get(String(a._id)) || 'Ambassadeur',
      code: a.code,
      sales: a.sales,
      revenue: Math.round(a.revenue),
      commission: Math.round(a.commission),
    })),
    resellers: resellersAgg.map((r: any) => ({
      ownerUserId: String(r._id),
      name: r.name,
      shopSlug: r.shopSlug || null,
      reservations: r.reservations,
      confirmed: r.confirmed,
      qty: r.qty,
      amount: Math.round(r.amount),
    })),
    topGroups: topGroupsAgg.map((t: any) => ({
      groupId: t.groupId,
      name: t.name,
      status: t.status,
      joins: t.joins,
      paid: t.paid,
      currentQty: t.currentQty,
      minQty: t.minQty,
      deadline: t.deadline,
    })),
  })
}
