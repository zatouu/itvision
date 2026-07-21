import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { sendPushToUser } from '@/lib/push'
import { getAppConfig, creditCashBalance } from '@/lib/wallet'

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

    if (sr.escrowLocked) {
      return NextResponse.json({ error: 'Paiement bloqué par un litige' }, { status: 403 })
    }

    const cfg = await getAppConfig()
    const commissionRate = Number(cfg.monetization?.commissionRate) || 0
    const now = new Date()
    let totalReleased = 0
    let totalCommission = 0
    let releasedCount = 0
    const providerIds = new Set<string>()

    while (true) {
      const payment = await Payment.findOneAndUpdate(
        { requestId, status: 'held' },
        { $set: { status: 'released', releasedAt: now, releasedBy: userId } },
        { sort: { createdAt: 1 } }
      )
      if (!payment) break
      if (payment.providerId) providerIds.add(String(payment.providerId))

      const rawAmount = payment.phase === 'deposit' ? payment.depositAmount : payment.amount
      if (rawAmount <= 0) continue

      const commission = Math.round((rawAmount * commissionRate) / 100)
      const net = rawAmount - commission
      totalCommission += commission

      if (payment.provider !== 'cash' && net > 0) {
        await creditCashBalance(String(payment.providerId), net, {
          relatedMissionId: String(requestId),
          paymentRef: String(payment._id),
          description: `Reversement mission ${payment.phase === 'deposit' ? '(dépôt)' : payment.phase === 'balance' ? '(solde)' : '(total)'}`,
        })
      }

      totalReleased += net
      releasedCount++
    }

    if (releasedCount === 0) {
      return NextResponse.json({ error: 'Aucun paiement en escrow trouvé' }, { status: 404 })
    }

    for (const providerId of providerIds) {
      void sendPushToUser(providerId, {
        title: 'Paiement reçu',
        body: `${totalReleased.toLocaleString('fr-FR')} FCFA crédités sur votre portefeuille Xeuy.`,
        data: { type: 'payment:released', requestId: String(requestId) },
        appType: 'provider',
      })
    }

    return NextResponse.json({
      success: true,
      releasedAmount: totalReleased,
      commissionAmount: totalCommission,
      releasedCount,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/payments/release]', e)
    return NextResponse.json({ error: 'Erreur release' }, { status: 500 })
  }
}
