import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { checkPaymentStatus } from '@/lib/payment'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { refundEscrowPoints } from '@/lib/wallet'
import { sendPushToUser } from '@/lib/push'
import { confirmPayment as fulfillPayment } from '@/lib/payment-fulfillment'

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
      // Paiements manuels (lien/QR Wave marchand) : confirmation admin uniquement.
      // Sans cette exclusion, le trust-confirm >5min marquerait « held » un
      // paiement jamais reçu — et pour une commande marketplace, laisserait la
      // commande à pending alors que le Payment dit held (état incohérent).
      if (payment.manualConfirm) continue

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

          // Unknown → trust-confirm UNIQUEMENT pour les providers à API réelle
          // (les manuels sont exclus en amont via manualConfirm). Un provider
          // sans API qui n'est pas marqué manualConfirm ne doit pas être
          // auto-confirmé — risque de fraude.
          if (checkResult.status === 'unknown' && ageMs > TRUST_CONFIRM_AFTER_MS) {
            if (['wave', 'wave_qr', 'cash'].includes(String(payment.provider))) {
              continue // reste pending : confirmation manuelle/admin requise
            }
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

  // Commande marketplace : fulfillment canonique — met la commande à
  // 'completed', crédite les grains, notifie le client (idempotent).
  if (payment.domain === 'marketplace' || payment.orderType === 'marketplace') {
    if (payment.orderId) {
      try {
        await fulfillPayment({
          reference: String(payment.orderId),
          amount: payment.amount,
          provider: payment.provider as any,
          transactionId: payment.externalId || `SWEEP-${payment._id}`,
        })
      } catch (err) {
        console.error(`[sweeper] fulfillPayment failed for order ${payment.orderId}:`, err)
      }
    }
    return
  }

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
