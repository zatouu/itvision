import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'

/**
 * Refund an escrow payment (admin override or explicit client refund).
 * En production, ce endpoint ne marque que le statut interne : il faut
 * déclencher le remboursement chez le fournisseur de paiement (à brancher).
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
      await lifecycle.transition(requestId, 'cancelled', {
        actor: { userId, role: isAdmin ? 'admin' : 'client' },
        reason: body.reason || 'refund',
      })
    }

    // Si un paiement est encore held (admin override ou annulation sans paiement lifecycle), le rembourser
    const payment = await Payment.findOneAndUpdate(
      { requestId, status: 'held' },
      { $set: { status: 'refunded', refundedAt: new Date(), refundedBy: userId } },
      { new: true }
    )

    return NextResponse.json({ success: true, payment })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/payments/refund]', e)
    return NextResponse.json({ error: e.message || 'Erreur refund' }, { status: 500 })
  }
}
