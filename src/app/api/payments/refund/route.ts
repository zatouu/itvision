import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { refundEscrowPoints } from '@/lib/wallet'
import { queueClientRefund } from '@/modules/xeuy/payments/mission-payment'

/**
 * Annulation avec remboursement (client avant démarrage, ou administration).
 * Le remboursement réel au client est effectué depuis la file « Trésorerie Xeuy » de l'administration.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId requis' }, { status: 400 })
    }

    const sr = await ServiceRequest.findById(requestId)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
    if (String(sr.clientId) !== String(userId) && !isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Bloquer si la mission est déjà terminée ou en litige sans être admin
    if (!isAdmin && ['completed', 'dispute', 'archived'].includes(sr.status)) {
      return NextResponse.json({ error: 'Remboursement impossible pour cette mission' }, { status: 409 })
    }

    // Annuler via le lifecycle manager (effets de bord + remboursement atomiques)
    if (sr.status !== 'cancelled') {
      const lifecycle = await import('@/lib/mission-lifecycle')
      try {
        await lifecycle.transition(requestId, 'cancelled', {
          actor: { userId, role: isAdmin ? 'admin' : 'client' },
          reason: body.reason || 'refund',
        })
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Annulation impossible' }, { status: 409 })
      }
    }

    // Paiement encore en séquestre (mission déjà annulée sans traitement du paiement) : même file de remboursement
    const payment = await Payment.findOneAndUpdate(
      { requestId, status: 'held' },
      { $set: { status: 'refunded', refundedAt: new Date(), refundedBy: userId } },
      { new: true }
    )
    if (payment) {
      await Payment.updateOne({ _id: payment._id }, { $set: { refundAmount: payment.amount } })
      if (payment.escrowPointsCharged > 0) {
        await refundEscrowPoints(String(payment.clientId), String(requestId), payment.escrowPointsCharged).catch(() => {})
      }
      await queueClientRefund(payment._id, payment.amount, isAdmin ? 'Remboursement décidé par l’administration' : 'Annulation client')
    }

    return NextResponse.json({ success: true, payment })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/payments/refund]', e)
    return NextResponse.json({ error: e.message || 'Erreur refund' }, { status: 500 })
  }
}
