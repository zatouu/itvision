import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import { sendPushToUser } from '@/lib/push'
import { refundEscrowPoints } from '@/lib/wallet'
import { fulfillServicePayment, isMissionPayment } from '@/modules/xeuy/payments/mission-payment'
import { verifyWebhookSignature } from '@/lib/webhook-verify'
import { claimPendingPayment } from '@/lib/payments/transition'
import { confirmPayment } from '@/lib/payment-fulfillment'

/**
 * Webhook endpoint for Mobile Money providers.
 * Called by Wave, Orange Money, or Free Money when payment status changes.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const sig = verifyWebhookSignature(request.headers, rawBody)
    if (!sig.valid) {
      console.warn('[Webhook] Signature invalide:', sig.error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectMongoose()
    const body = JSON.parse(rawBody)

    // Enveloppe Wave : { id: eventId, type: 'checkout.session.completed'|'checkout.session.payment_failed', data: { id: 'cos-...', payment_status, ... } }
    const isWaveEnvelope = typeof body.type === 'string' && body.type.startsWith('checkout.session.') && body.data
    const payload = isWaveEnvelope ? body.data : body

    // Extract transaction ID and status (varies by provider)
    const externalId = payload.id || payload.transactionId || payload.payToken || payload.client_reference || body.transaction_id
    const status = payload.status || payload.payment_status || (body.type === 'checkout.session.completed' ? 'succeeded' : body.type === 'checkout.session.payment_failed' ? 'cancelled' : '')

    if (!externalId) {
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })
    }

    const payment = await Payment.findOne({ externalId })
    if (!payment) {
      console.warn('[Webhook] Payment not found for externalId:', externalId)
      return NextResponse.json({ received: true })
    }

    // Map provider status to our status
    const isSuccess = ['successful', 'succeeded', 'completed', 'SUCCEEDED', 'paid'].includes(status)
    const isFailed = ['failed', 'cancelled', 'expired', 'FAILED'].includes(status)

    // Succès tardif sur un paiement de mission expiré : l'argent est reçu, il doit servir ou être rendu (Xeuy).
    // Les commandes DDM+ gardent leur propre flux (confirmPayment) et ne sont pas concernées.
    const lateMissionSuccess = payment.status === 'failed' && isMissionPayment(payment)
    if (isSuccess && (payment.status === 'pending' || lateMissionSuccess)) {
      const claimed = payment.status === 'pending'
        ? await claimPendingPayment(payment._id, { status: 'held', heldAt: new Date(), confirmedBy: 'webhook' })
        : await Payment.findOneAndUpdate(
            { _id: payment._id, status: 'failed' },
            { $set: { status: 'held', heldAt: new Date(), confirmedBy: 'webhook', failReason: `${payment.failReason || ''} (paiement reçu ensuite)`.trim() } },
            { new: true }
          )
      if (!claimed) return NextResponse.json({ received: true })

      if (payment.orderId) {
        // Commande marketplace ou participation d'achat groupé : flux canonique (grains, emails, parrainage)
        const conf = await confirmPayment({
          reference: String(payment.orderId),
          amount: payment.amount,
          provider: payment.provider as any,
          transactionId: payment.externalId || `WEBHOOK-${payment._id}`,
        })
        if (!conf.found) {
          console.error(`[Webhook] Commande introuvable pour payment ${payment._id} (orderId=${payment.orderId})`)
        }
      } else {
        await fulfillServicePayment(payment._id)
      }
    } else if (isFailed && payment.status === 'pending') {
      const failReason = payload.last_payment_error?.code || payload.failure_reason || payload.error || body.error || status
      const claimed = await claimPendingPayment(payment._id, { status: 'failed', failedAt: new Date(), failReason })
      if (!claimed) return NextResponse.json({ received: true })

      // Rembourser les points escrow prélevés
      try {
        const escrowCost = payment.escrowPointsCharged || 0
        if (escrowCost > 0) {
          await refundEscrowPoints(String(payment.clientId), String(payment.requestId), escrowCost)
        }
      } catch (refundErr) {
        console.error('[webhook] Erreur remboursement points escrow', refundErr)
      }

      await sendPushToUser(String(payment.clientId), {
        title: '❌ Paiement échoué',
        body: `Le paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA a échoué. Réessayez.`,
        data: { type: 'payment:failed', requestId: String(payment.requestId) },
      })
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[POST /api/payments/webhook]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
