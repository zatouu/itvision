import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import User from '@/lib/models/User'
import { releasePayment } from '@/lib/payment'
import { sendPushToUser } from '@/lib/push'

/**
 * Release escrow payment to provider when mission is completed.
 * Called automatically when status → completed, or manually by client/provider.
 * For deposit mode, only the held deposit is released. The balance is handled separately.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json({ error: 'requestId requis' }, { status: 400 })
    }

    const sr = await ServiceRequest.findById(requestId)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    if (!isClient && !isProvider) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (sr.status !== 'completed') {
      return NextResponse.json({ error: 'La mission doit être terminée pour libérer le paiement' }, { status: 400 })
    }

    const payment = await Payment.findOne({ requestId, status: 'held' })
    if (!payment) {
      return NextResponse.json({ error: 'Aucun paiement en escrow trouvé' }, { status: 404 })
    }

    // Amount to release: deposit only if phase was deposit, else full amount
    const releaseAmount = payment.phase === 'deposit' ? payment.depositAmount : payment.amount
    if (releaseAmount <= 0) {
      return NextResponse.json({ error: 'Montant à libérer invalide' }, { status: 400 })
    }

    // Get provider phone for payout
    const provider = await User.findById(payment.providerId).select('phone').lean()
    const providerPhone = (provider as any)?.phone || ''

    const result = await releasePayment(
      payment.provider as any,
      payment.externalId,
      releaseAmount,
      providerPhone,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Échec du payout' }, { status: 502 })
    }

    payment.status = 'released'
    payment.releasedAt = new Date()
    await payment.save()

    // Notify provider
    await sendPushToUser(String(payment.providerId), {
      title: '💰 Paiement reçu !',
      body: `${releaseAmount.toLocaleString('fr-FR')} FCFA envoyés sur votre compte ${payment.provider}.`,
      data: { type: 'payment:released', requestId: String(requestId) },
      appType: 'provider',
    })

    return NextResponse.json({ success: true, payment, releasedAmount: releaseAmount })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/payments/release]', e)
    return NextResponse.json({ error: 'Erreur release' }, { status: 500 })
  }
}
