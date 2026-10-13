import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import Payment from '@/lib/models/Payment'
import User from '@/lib/models/User'
import { sendPushToUser } from '@/lib/push'
import { logAuditEvent } from '@/lib/audit'
import { MISSION_PAYMENT } from '@/modules/xeuy/payments/mission-payment'

const ROLES = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT']

/**
 * GET /api/admin/platform/refunds?status=pending|done
 * Xeuy uniquement : remboursements clients décidés sur des missions (annulation, litige, offre non attribuable) à virer réellement.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  await connectMongoose()
  const status = request.nextUrl.searchParams.get('status') === 'done' ? 'done' : 'pending'
  const items = await Payment.find({ ...MISSION_PAYMENT, refundStatus: status })
    .sort({ refundedAt: status === 'pending' ? 1 : -1 })
    .limit(200)
    .select('amount refundAmount provider clientId requestId orderId phase refundReason refundedAt refundReference refundMethod refundDoneAt externalId reference')
    .lean() as any[]

  const clientIds = items.map(p => p.clientId).filter(id => mongoose.isValidObjectId(id))
  const users = await User.find({ _id: { $in: clientIds } }).select('name phone email').lean() as any[]
  const byId = new Map(users.map(u => [String(u._id), u]))

  const totalPending = status === 'pending'
    ? items.reduce((s, p) => s + (p.refundAmount || p.amount || 0), 0)
    : undefined

  return NextResponse.json({
    success: true,
    totalPending,
    items: items.map(p => ({ ...p, amountToRefund: p.refundAmount || p.amount, client: byId.get(String(p.clientId)) || null })),
  })
}

/**
 * PATCH /api/admin/platform/refunds  { id, reference, method? }
 * Le virement au client a été fait chez l'opérateur : la référence de transaction est obligatoire.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  try {
    await connectMongoose()
    const body = await request.json().catch(() => ({}))
    const id = String(body?.id || '')
    const reference = String(body?.reference || '').trim().slice(0, 120)
    const method = String(body?.method || '').trim().slice(0, 40)
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 })
    if (reference.length < 4) return NextResponse.json({ success: false, error: 'Référence de la transaction opérateur requise' }, { status: 400 })

    const payment = await Payment.findOneAndUpdate(
      { _id: id, ...MISSION_PAYMENT, refundStatus: 'pending' },
      { $set: { refundStatus: 'done', refundReference: reference, refundMethod: method || undefined, refundDoneAt: new Date(), refundDoneBy: auth.user.id } },
      { new: true }
    ).lean() as any
    if (!payment) return NextResponse.json({ success: false, error: 'Remboursement introuvable ou déjà effectué' }, { status: 409 })

    const amount = payment.refundAmount || payment.amount
    void sendPushToUser(String(payment.clientId), {
      title: 'Remboursement effectué',
      body: `${amount.toLocaleString('fr-FR')} FCFA vous ont été renvoyés (réf. ${reference}).`,
      data: { type: 'payment:refunded', requestId: String(payment.requestId || '') },
      appType: 'consumer',
    })
    void logAuditEvent({
      entityType: 'Payment',
      entityId: String(payment._id),
      action: 'refund_executed',
      userId: String(auth.user.id),
      userRole: auth.user.role,
      ip: request.headers.get('x-forwarded-for') || undefined,
      metadata: { amount, reference, method },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[PATCH /api/admin/platform/refunds]', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
