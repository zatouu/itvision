/**
 * GET   /api/admin/market/ambassadors — commissions par ambassadeur (à verser, en attente, versées)
 * PATCH /api/admin/market/ambassadors { ambassadorUserId, reference } — versement effectué chez l'opérateur
 */
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AmbassadorCommission from '@/lib/models/AmbassadorCommission'
import User from '@/lib/models/User'
import { notifyUser } from '@/lib/notify'

const ROLES = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT']

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  await connectMongoose()
  const rows = await AmbassadorCommission.aggregate([
    {
      $group: {
        _id: '$ambassadorUserId',
        code: { $first: '$code' },
        sales: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$baseAmount', 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        validated: { $sum: { $cond: [{ $eq: ['$status', 'validated'] }, '$amount', 0] } },
        requested: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'validated'] }, { $ifNull: ['$payoutRequestedAt', false] }] }, '$amount', 0] } },
        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
        payoutMethod: { $max: '$payoutMethod' },
        payoutPhone: { $max: '$payoutPhone' },
        lastSaleAt: { $max: '$createdAt' },
      },
    },
    { $sort: { requested: -1, validated: -1, lastSaleAt: -1 } },
    { $limit: 300 },
  ])
  const users = await User.find({ _id: { $in: rows.map(r => r._id) } }).select('name phone email').lean() as any[]
  const byId = new Map(users.map(u => [String(u._id), u]))
  return NextResponse.json({
    success: true,
    ambassadors: rows.map(r => {
      const u = byId.get(String(r._id))
      return {
        ambassadorUserId: String(r._id),
        code: r.code,
        name: u?.name || 'Ambassadeur',
        phone: u?.phone,
        email: u?.email,
        sales: r.sales,
        revenue: Math.round(r.revenue),
        pending: Math.round(r.pending),
        validated: Math.round(r.validated),
        requested: Math.round(r.requested),
        paid: Math.round(r.paid),
        payoutMethod: r.payoutMethod,
        payoutPhone: r.payoutPhone,
        lastSaleAt: r.lastSaleAt,
      }
    }),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => ({}))
  const reference = String(body?.reference || '').trim().slice(0, 120)
  const ambassadorUserId = String(body?.ambassadorUserId || '')
  if (reference.length < 4) return NextResponse.json({ success: false, error: 'Référence du versement requise' }, { status: 400 })
  if (!mongoose.isValidObjectId(ambassadorUserId)) return NextResponse.json({ success: false, error: 'Ambassadeur invalide' }, { status: 400 })

  await connectMongoose()
  const filter = { ambassadorUserId: new mongoose.Types.ObjectId(ambassadorUserId), status: 'validated', payoutRequestedAt: { $exists: true } }
  const due = await AmbassadorCommission.find(filter).select('_id amount').lean() as any[]
  if (due.length === 0) return NextResponse.json({ success: false, error: 'Aucune demande de versement en attente' }, { status: 409 })
  const amount = due.reduce((s, c) => s + (c.amount || 0), 0)
  await AmbassadorCommission.updateMany(
    { _id: { $in: due.map(c => c._id) }, status: 'validated' },
    { $set: { status: 'paid', paidAt: new Date(), paidReference: reference, paidBy: auth.user.email || auth.user.id } }
  )
  void notifyUser(ambassadorUserId, {
    type: 'success',
    title: 'Commissions versées',
    message: `${Math.round(amount).toLocaleString('fr-FR')} F vous ont été versés (réf. ${reference}). Merci de faire grandir DDM+.`,
    actionUrl: '/compte/ambassadeur',
  })
  return NextResponse.json({ success: true, amount })
}
