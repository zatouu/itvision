import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import TopupPayment from '@/lib/models/TopupPayment'
import { creditPoints } from '@/lib/wallet'
import { verifyWebhookSignature } from '@/lib/webhook-verify'

/**
 * Webhook endpoint for Mobile Money topup confirmations.
 * Called by Wave, Orange Money, or Free Money when payment status changes.
 * Credits points to user's wallet on successful payment.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const sig = verifyWebhookSignature(request.headers, rawBody)
    if (!sig.valid) {
      console.warn('[Wallet Webhook] Signature invalide:', sig.error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectMongoose()
    const body = JSON.parse(rawBody)

    // Enveloppe Wave : { id: eventId, type: 'checkout.session.*', data: { id: 'cos-...', payment_status, ... } }
    const isWaveEnvelope = typeof body.type === 'string' && body.type.startsWith('checkout.session.') && body.data
    const payload = isWaveEnvelope ? body.data : body

    // Extract transaction ID and status (varies by provider)
    const externalId = payload.id || payload.transactionId || payload.payToken || payload.client_reference || body.transaction_id
    const status = payload.status || payload.payment_status || (body.type === 'checkout.session.completed' ? 'succeeded' : body.type === 'checkout.session.payment_failed' ? 'cancelled' : '')

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
    const isSuccess = ['successful', 'succeeded', 'completed', 'SUCCEEDED', 'paid'].includes(status)
    const isFailed = ['failed', 'cancelled', 'expired', 'FAILED'].includes(status)

    if (isSuccess) {
      topup.status = 'successful'
      topup.completedAt = new Date()
      await topup.save()

      // Credit bonus points first if any
      const bonusCredits = topup.bonusCredits || 0
      if (bonusCredits > 0) {
        await creditPoints(topup.userId, bonusCredits, 'promo', {
          description: `Bonus ${bonusCredits} crédits offerts (pack)`,
          paymentRef: externalId,
        })
      }

      // Credit points to user's wallet
      const { balance } = await creditPoints(topup.userId, topup.points, 'topup', {
        description: `Recharge ${topup.points} pts (${topup.amountFcfa} FCFA via ${topup.provider})`,
        paymentRef: externalId,
      })

      const total = topup.points + (topup.bonusCredits || 0)

      // Push notification
      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(topup.userId, {
        title: '💳 Recharge confirmée',
        body: `${total} crédits crédités. Solde: ${balance} crédits.`,
        data: { type: 'wallet:topped-up', points: topup.points, bonusCredits: topup.bonusCredits, balance },
      })

      return NextResponse.json({ received: true, credited: true, points: topup.points, bonusCredits: topup.bonusCredits, total, balance })
    }

    if (isFailed) {
      topup.status = 'failed'
      topup.completedAt = new Date()
      topup.failReason = payload.last_payment_error?.code || payload.failure_reason || payload.error || body.error || status
      await topup.save()

      const { sendPushToUser } = await import('@/lib/push')
      await sendPushToUser(topup.userId, {
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
