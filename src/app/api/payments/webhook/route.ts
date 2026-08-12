import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import { Order } from '@/lib/models/Order'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { sendPushToUser } from '@/lib/push'
import { refundEscrowPoints } from '@/lib/wallet'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { verifyWebhookSignature } from '@/lib/webhook-verify'

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

    if (isSuccess && payment.status === 'pending') {
      // Payment held successfully
      payment.status = 'held'
      payment.heldAt = new Date()
      payment.confirmedBy = 'webhook'
      await payment.save()

      if (payment.orderId) {
        // Marketplace order payment
        const order = await Order.findOne({ orderId: payment.orderId })
        if (order) {
          order.paymentStatus = 'completed'
          order.status = 'confirmed'
          order.confirmedAt = new Date()
          order.transactionId = payment.externalId || order.transactionId
          await order.save()
        }
      } else {
        // Services offer payment
        const sr = await ServiceRequest.findById(payment.requestId)
        const offer = await Offer.findById(payment.offerId)
        if (sr && offer) {
          await acceptOfferForRequest({
            serviceRequest: sr,
            offer,
            securePayment: payment.useEscrow !== false,
            notifyClientPaymentHeld: payment.useEscrow !== false,
            amount: payment.amount,
          })
        }
      }
    } else if (isFailed && payment.status === 'pending') {
      payment.status = 'failed'
      payment.failedAt = new Date()
      payment.failReason = payload.last_payment_error?.code || payload.failure_reason || payload.error || body.error || status
      await payment.save()

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
