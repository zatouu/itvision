import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { refundEscrowPoints } from '@/lib/wallet'

/**
 * Refund an escrow payment (client or admin initiated).
 * Typically called when a mission is cancelled before completion.
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

    // Only refund if payment is held (not already released/refunded/failed)
    const payment = await Payment.findOne({ requestId, status: 'held' })
    if (!payment) {
      return NextResponse.json({ error: 'Aucun paiement en escrow remboursable' }, { status: 404 })
    }

    // Update payment status
    payment.status = 'refunded'
    payment.refundedAt = new Date()
    await payment.save()

    // Refund escrow points if any
    try {
      const escrowCost = payment.escrowPointsCharged || 0
      if (escrowCost > 0) {
        await refundEscrowPoints(String(payment.clientId), String(requestId), escrowCost)
      }
    } catch (refundErr) {
      console.error('[refund] Erreur remboursement points escrow', refundErr)
    }

    // Optionally update service request status
    if (sr.status !== 'cancelled') {
      sr.status = 'cancelled'
      await sr.save()
    }

    return NextResponse.json({ success: true, payment })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/payments/refund]', e)
    return NextResponse.json({ error: 'Erreur refund' }, { status: 500 })
  }
}
