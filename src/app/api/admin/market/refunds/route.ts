import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import ReturnRequest from '@/lib/models/ReturnRequest'
import { notifyUser } from '@/lib/notify'

const ROLES = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT']

/**
 * GET /api/admin/market/refunds
 * DDM+ uniquement : argent à rendre aux clients (commandes payées annulées ou payées après annulation,
 * participants d'achats groupés annulés, retours reçus en attente de remboursement) + historique.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  await connectMongoose()
  const [orders, groups, returns, done, paidGroups] = await Promise.all([
    Order.find({ refundStatus: 'pending' })
      .sort({ updatedAt: 1 })
      .select('orderId clientName clientPhone clientEmail refundAmount total paymentMethod transactionId status updatedAt')
      .limit(200).lean() as Promise<any[]>,
    GroupOrder.find({ status: 'cancelled', participants: { $elemMatch: { paidAmount: { $gt: 0 }, paymentStatus: { $ne: 'refunded' } } } })
      .select('groupId product.name participants updatedAt')
      .limit(100).lean() as Promise<any[]>,
    ReturnRequest.find({ status: 'received' })
      .sort({ updatedAt: 1 })
      .select('orderReference clientName clientPhone items reason updatedAt')
      .limit(100).lean() as Promise<any[]>,
    Order.find({ refundStatus: 'done' })
      .sort({ refundedAt: -1 })
      .select('orderId clientName clientPhone refundAmount refundReference refundedAt refundedBy')
      .limit(50).lean() as Promise<any[]>,
    GroupOrder.find({ status: { $nin: ['cancelled', 'draft'] }, 'participants.paidAmount': { $gt: 0 } })
      .select('groupId product.name participants')
      .limit(200).lean() as Promise<any[]>,
  ])

  // Trop-perçu : versé au-delà du montant final du participant (prix baissé après paiement, double paiement)
  const overpaid = paidGroups.flatMap(g => (g.participants || [])
    .filter((p: any) => p.paymentStatus !== 'refunded' && (p.paidAmount || 0) - (p.totalAmount || 0) >= 1)
    .map((p: any) => ({
      groupId: g.groupId,
      productName: g.product?.name,
      participantId: String(p._id),
      name: p.name,
      phone: p.phone,
      amount: Math.round(p.paidAmount - p.totalAmount),
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
      overpaid: true,
    })))

  const groupRefunds = groups.flatMap(g => (g.participants || [])
    .filter((p: any) => (p.paidAmount || 0) > 0 && p.paymentStatus !== 'refunded')
    .map((p: any) => ({
      groupId: g.groupId,
      productName: g.product?.name,
      participantId: String(p._id),
      name: p.name,
      phone: p.phone,
      amount: p.paidAmount,
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
    })))

  // Montant suggéré pour un retour : prix payés des articles retournés
  const refs = returns.map(r => r.orderReference)
  const returnOrders = await Order.find({ orderId: { $in: refs } }).select('orderId items total refundAmount paymentMethod').lean() as any[]
  const orderByRef = new Map(returnOrders.map(o => [o.orderId, o]))
  const returnRefunds = returns.map(r => {
    const o = orderByRef.get(r.orderReference)
    const suggested = (r.items || []).reduce((s: number, it: any) => {
      const line = (o?.items || []).find((x: any) => String(x.id) === String(it.productId))
      return s + (Number(line?.price) || 0) * (Number(it.qty) || 0)
    }, 0)
    const refundable = Math.max(0, (o?.total || 0) - (o?.refundAmount || 0))
    return {
      returnId: String(r._id),
      orderId: r.orderReference,
      name: r.clientName,
      phone: r.clientPhone,
      reason: r.reason,
      items: (r.items || []).map((it: any) => `${it.qty} × ${it.name}`),
      suggestedAmount: Math.min(Math.round(suggested), refundable),
      refundable,
      paymentMethod: o?.paymentMethod,
    }
  })

  const total = orders.reduce((s, o) => s + (o.refundAmount || o.total || 0), 0)
    + groupRefunds.reduce((s, g) => s + (g.amount || 0), 0)
    + overpaid.reduce((s, g) => s + g.amount, 0)
    + returnRefunds.reduce((s, r) => s + r.suggestedAmount, 0)

  return NextResponse.json({ success: true, totalPending: total, orders, groups: [...groupRefunds, ...overpaid], returns: returnRefunds, done })
}

/**
 * PATCH /api/admin/market/refunds
 *   { kind: 'order', orderId, reference }
 *   { kind: 'group', groupId, participantId, reference }
 * Le virement a été fait chez l'opérateur : référence obligatoire. (Retours : PATCH /api/returns/[id].)
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  await connectMongoose()
  const body = await request.json().catch(() => ({}))
  const reference = String(body?.reference || '').trim().slice(0, 120)
  if (reference.length < 4) {
    return NextResponse.json({ success: false, error: 'Référence de la transaction opérateur requise' }, { status: 400 })
  }
  const by = auth.user.email || auth.user.id

  if (body?.kind === 'order') {
    const order = await Order.findOneAndUpdate(
      { orderId: String(body.orderId || ''), refundStatus: 'pending' },
      { $set: { refundStatus: 'done', refundReference: reference, refundedAt: new Date(), refundedBy: by } },
      { new: true }
    ).lean() as any
    if (!order) return NextResponse.json({ success: false, error: 'Aucun remboursement en attente sur cette commande' }, { status: 409 })
    if (order.clientId) {
      void notifyUser(String(order.clientId), {
        type: 'success',
        title: `Remboursement effectué — ${order.orderId}`,
        message: `${Math.round(order.refundAmount || order.total).toLocaleString('fr-FR')} FCFA vous ont été remboursés (réf. ${reference}).`,
        actionUrl: `/commandes/${order.orderId}`,
      })
    }
    return NextResponse.json({ success: true })
  }

  if (body?.kind === 'group') {
    const participantId = String(body.participantId || '')
    if (!mongoose.isValidObjectId(participantId)) {
      return NextResponse.json({ success: false, error: 'Participant invalide' }, { status: 400 })
    }
    const now = new Date()
    const res = await GroupOrder.updateOne(
      {
        groupId: String(body.groupId || ''),
        participants: { $elemMatch: { _id: new mongoose.Types.ObjectId(participantId), paidAmount: { $gt: 0 }, paymentStatus: { $ne: 'refunded' } } },
      },
      {
        $set: {
          'participants.$.paymentStatus': 'refunded',
          'participants.$.adminNote': `Remboursé le ${now.toLocaleDateString('fr-FR')} — réf. ${reference} (${by})`,
          'participants.$.paymentUpdatedAt': now,
        },
      }
    )
    if (res.modifiedCount !== 1) {
      return NextResponse.json({ success: false, error: 'Participant introuvable ou déjà remboursé' }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  }

  if (body?.kind === 'group_overpay') {
    const participantId = String(body.participantId || '')
    if (!mongoose.isValidObjectId(participantId)) {
      return NextResponse.json({ success: false, error: 'Participant invalide' }, { status: 400 })
    }
    const group = await GroupOrder.findOne({ groupId: String(body.groupId || '') }).select('participants').lean() as any
    const p = (group?.participants || []).find((x: any) => String(x._id) === participantId)
    const excess = p ? Math.round((p.paidAmount || 0) - (p.totalAmount || 0)) : 0
    if (!p || excess < 1) {
      return NextResponse.json({ success: false, error: 'Aucun trop-perçu sur ce participant' }, { status: 409 })
    }
    const now = new Date()
    // Mise à jour optimiste : échoue si le montant versé a changé entre-temps
    const res = await GroupOrder.updateOne(
      { groupId: String(body.groupId), participants: { $elemMatch: { _id: new mongoose.Types.ObjectId(participantId), paidAmount: p.paidAmount } } },
      {
        $set: {
          'participants.$.paidAmount': p.totalAmount,
          'participants.$.adminNote': `Trop-perçu de ${excess} FCFA remboursé le ${now.toLocaleDateString('fr-FR')} — réf. ${reference} (${by})`,
          'participants.$.paymentUpdatedAt': now,
        },
      }
    )
    if (res.modifiedCount !== 1) {
      return NextResponse.json({ success: false, error: 'Le paiement a changé entre-temps, rechargez la page' }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: 'Type de remboursement invalide' }, { status: 400 })
}
