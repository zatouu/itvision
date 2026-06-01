import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import TopupPayment from '@/lib/models/TopupPayment'
import { creditPoints } from '@/lib/wallet'

/**
 * Webhook endpoint for Mobile Money topup confirmations.
 * Called by Wave, Orange Money, or Free Money when payment status changes.
 * Credits points to user's wallet on successful payment.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()

    // Extract transaction ID and status (varies by provider)
    const externalId = body.id || body.transactionId || body.payToken || body.client_reference
    const status = body.status || body.payment_status || ''

    if (!externalId) {
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })
    }

    const topup = await TopupPayment.findOne({ externalId })
    if (!topup) {
      console.warn('[Wallet Webhook] Topup not found for externalId:', externalId)
      return NextResponse.json({ received: true })
    }

    // Already processed
    if (topup.status !== 'pending') {
      return NextResponse.json({ received: true, alreadyProcessed: true })
    }

    // Map provider status to our status
    const isSuccess = ['successful', 'completed', 'SUCCEEDED', 'paid'].includes(status)
    const isFailed = ['failed', 'cancelled', 'expired', 'FAILED'].includes(status)

    if (isSuccess) {
      topup.status = 'successful'
      topup.completedAt = new Date()
      await topup.save()

      // Credit points to user's wallet
      const { balance } = await creditPoints(topup.userId, topup.points, 'topup', {
        description: `Recharge ${topup.points} pts (${topup.amountFcfa} FCFA via ${topup.provider})`,
        paymentRef: externalId,
      })

      // Push notification (fire & forget)
      const { sendPushToUser } = await import('@/lib/push')
      void sendPushToUser(topup.userId, {
        title: '💳 Recharge confirmée',
        body: `${topup.points} points crédités. Solde: ${balance} pts.`,
        data: { type: 'wallet:topped-up', points: topup.points, balance },
      })

      return NextResponse.json({ received: true, credited: true, points: topup.points, balance })
    }

    if (isFailed) {
      topup.status = 'failed'
      topup.completedAt = new Date()
      topup.failReason = body.failure_reason || body.error || status
      await topup.save()

      const { sendPushToUser } = await import('@/lib/push')
      void sendPushToUser(topup.userId, {
        title: '❌ Recharge échouée',
        body: `Le paiement de ${topup.amountFcfa.toLocaleString('fr-FR')} FCFA a échoué. Réessayez.`,
        data: { type: 'wallet:topup-failed', topupId: String(topup._id) },
      })
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[POST /api/wallet/webhook]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
