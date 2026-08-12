import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { checkPaymentStatus } from '@/lib/payment'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { refundEscrowPoints } from '@/lib/wallet'
import { sendPushToUser } from '@/lib/push'

/**
 * Payment Sweeper — server-side reconciliation for pending payments.
 *
 * Runs every 2 minutes (called from instrumentation.ts).
 * For each pending payment:
 * - If older than 3 minutes: query provider API
 *   - If succeeded → transition to held + accept offer
 *   - If failed → mark failed + refund escrow
 *   - If unknown (no API / QR manual) and older than 5 minutes → trust-based confirm
 * - If older than 30 minutes and still pending → mark failed + refund
 */

const SWEEP_INTERVAL_MS = 2 * 60 * 1000
const QUERY_AFTER_MS = 3 * 60 * 1000
const TRUST_CONFIRM_AFTER_MS = 5 * 60 * 1000
const FAIL_AFTER_MS = 30 * 60 * 1000

let sweepRunning = false

export async function sweepPendingPayments(): Promise<void> {
  if (sweepRunning) return
  sweepRunning = true

  try {
    await connectMongoose()
    const now = Date.now()
    const pendingPayments = await Payment.find({ status: 'pending' }).lean()

    for (const payment of pendingPayments as any[]) {
      const ageMs = now - new Date(payment.createdAt).getTime()

      try {
        // Too old → fail + refund
        if (ageMs > FAIL_AFTER_MS) {
          await Payment.updateOne(
            { _id: payment._id, status: 'pending' },
            {
              $set: {
                status: 'failed',
                failedAt: new Date(),
                failReason: 'Sweeper: payment expired (30min)',
                confirmedBy: 'system_reconcile',
              },
            },
          )
          if (payment.escrowPointsCharged > 0) {
            await refundEscrowPoints(String(payment.clientId), String(payment.requestId), payment.escrowPointsCharged).catch(() => {})
          }
          console.warn(`[sweeper] Payment ${payment._id} expired (30min) → failed`)
          continue
        }

        // Query provider API after 3 minutes
        if (ageMs > QUERY_AFTER_MS) {
          const checkResult = await checkPaymentStatus(payment.provider, payment.externalId)

          if (checkResult.status === 'succeeded') {
            await confirmPayment(payment, 'system_reconcile')
            console.log(`[sweeper] Payment ${payment._id} confirmed via provider API`)
            continue
          }

          if (checkResult.status === 'failed') {
            await Payment.updateOne(
              { _id: payment._id, status: 'pending' },
              {
                $set: {
                  status: 'failed',
                  failedAt: new Date(),
                  failReason: `Sweeper: provider returned failed`,
                  confirmedBy: 'system_reconcile',
                },
              },
            )
            if (payment.escrowPointsCharged > 0) {
              await refundEscrowPoints(String(payment.clientId), String(payment.requestId), payment.escrowPointsCharged).catch(() => {})
            }
            console.warn(`[sweeper] Payment ${payment._id} failed via provider API`)
            continue
          }

          // Unknown (no API / QR manual) → trust-based confirm after 5 minutes
          if (checkResult.status === 'unknown' && ageMs > TRUST_CONFIRM_AFTER_MS) {
            await confirmPayment(payment, 'system_reconcile')
            console.log(`[sweeper] Payment ${payment._id} trust-confirmed (unknown status, >5min)`)
            continue
          }
        }
      } catch (err) {
        console.error(`[sweeper] Error processing payment ${payment._id}:`, err)
      }
    }
  } catch (err) {
    console.error('[sweeper] Fatal error:', err)
  } finally {
    sweepRunning = false
  }
}

async function confirmPayment(payment: any, confirmedBy: string): Promise<void> {
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'pending' },
    {
      $set: {
        status: 'held',
        heldAt: new Date(),
        confirmedBy,
      },
    },
    { new: true },
  )
  if (!updated) return

  if (payment.phase !== 'balance' && payment.requestId) {
    const sr = await ServiceRequest.findById(payment.requestId)
    const offer = await Offer.findById(payment.offerId)
    if (sr && offer) {
      try {
        await acceptOfferForRequest({
          serviceRequest: sr,
          offer,
          securePayment: payment.useEscrow !== false,
          notifyClientPaymentHeld: payment.useEscrow !== false,
          amount: payment.amount,
        })
      } catch (err) {
        console.error(`[sweeper] acceptOfferForRequest failed for ${payment._id}:`, err)
      }
    }
  }

  void sendPushToUser(String(payment.clientId), {
    title: '✅ Paiement confirmé',
    body: `${payment.amount.toLocaleString('fr-FR')} FCFA — mission démarrée.`,
    data: { type: 'payment:confirmed', requestId: String(payment.requestId) },
  })
}

export function startPaymentSweeper(): void {
  setInterval(async () => {
    try {
      await sweepPendingPayments()
    } catch (err) {
      console.error('[payment-sweeper] interval error:', err)
    }
  }, SWEEP_INTERVAL_MS)
  console.log(`🔄 Payment sweeper started (every ${SWEEP_INTERVAL_MS / 1000}s)`)
}
