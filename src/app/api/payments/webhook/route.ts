import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { sendPushToUser } from '@/lib/push'
import { refundEscrowPoints } from '@/lib/wallet'
import { acceptOfferForRequest } from '@/lib/service-acceptance'

/**
 * Webhook endpoint for Mobile Money providers.
 * Called by Wave, Orange Money, or Free Money when payment status changes.
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

    const payment = await Payment.findOne({ externalId })
    if (!payment) {
      console.warn('[Webhook] Payment not found for externalId:', externalId)
      return NextResponse.json({ received: true })
    }

    // Map provider status to our status
    const isSuccess = ['successful', 'completed', 'SUCCEEDED', 'paid'].includes(status)
    const isFailed = ['failed', 'cancelled', 'expired', 'FAILED'].includes(status)

    if (isSuccess && payment.status === 'pending') {
      // Payment held successfully
      payment.status = 'held'
      payment.heldAt = new Date()
      await payment.save()

      // Now accept the offer (same logic as /accept endpoint)
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
    } else if (isFailed && payment.status === 'pending') {
      payment.status = 'failed'
      payment.failedAt = new Date()
      payment.failReason = body.failure_reason || body.error || status
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

      void sendPushToUser(String(payment.clientId), {
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
