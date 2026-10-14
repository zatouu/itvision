import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import { checkPaymentStatus } from '@/lib/payment'
import { fulfillServicePayment, isMissionPayment } from '@/modules/xeuy/payments/mission-payment'
import { refundEscrowPoints } from '@/lib/wallet'
import { sendPushToUser } from '@/lib/push'
import { confirmPayment as fulfillPayment } from '@/lib/payment-fulfillment'

/**
 * Payment Sweeper — server-side reconciliation for pending payments.
 *
 * Runs every 2 minutes (called from instrumentation.ts).
 * For each pending payment older than 3 minutes, query the provider API:
 * - succeeded → held + attribution de l'offre (ou remboursement si elle n'est plus disponible)
 * - failed (ou expiré selon le fournisseur après 30 min) → failed + points escrow rendus
 * - unknown après 30 min → file de vérification manuelle (jamais confirmé ni échoué sans preuve)
 */

const SWEEP_INTERVAL_MS = 2 * 60 * 1000
const QUERY_AFTER_MS = 3 * 60 * 1000
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
      const mission = isMissionPayment(payment)

      try {
        // DDM+ (commandes, achats groupés) : expiration à 30 min, le client relance depuis son lien de paiement
        if (!mission && ageMs > FAIL_AFTER_MS) {
          await Payment.updateOne(
            { _id: payment._id, status: 'pending' },
            { $set: { status: 'failed', failedAt: new Date(), failReason: 'Sweeper: payment expired (30min)', confirmedBy: 'system_reconcile' } },
          )
          continue
        }
        if (ageMs <= QUERY_AFTER_MS) continue
        const checkResult = await checkPaymentStatus(payment.provider, payment.externalId)

        if (checkResult.status === 'succeeded') {
          await confirmPayment(payment, 'system_reconcile')
          console.log(`[sweeper] Payment ${payment._id} confirmed via provider API`)
          continue
        }

        if (checkResult.status === 'failed' || (ageMs > FAIL_AFTER_MS && checkResult.status !== 'unknown')) {
          const failed = await Payment.updateOne(
            { _id: payment._id, status: 'pending' },
            {
              $set: {
                status: 'failed',
                failedAt: new Date(),
                failReason: checkResult.status === 'failed' ? 'Sweeper: provider returned failed' : 'Sweeper: payment expired (30min)',
                confirmedBy: 'system_reconcile',
              },
            },
          )
          if (failed.modifiedCount > 0 && payment.escrowPointsCharged > 0) {
            await refundEscrowPoints(String(payment.clientId), String(payment.requestId), payment.escrowPointsCharged).catch(() => {})
          }
          continue
        }

        // Mission Xeuy au statut inconnu après 30 min : ni confirmée sans preuve, ni échouée à l'aveugle (le client a peut-être payé).
        // Le paiement rejoint la file de vérification manuelle (relevé du compte marchand).
        if (mission && ageMs > FAIL_AFTER_MS) {
          await Payment.updateOne(
            { _id: payment._id, status: 'pending', manualConfirm: { $ne: true } },
            { $set: { manualConfirm: true, failReason: 'Statut fournisseur inconnu après 30 min : à vérifier' } },
          )
          console.warn(`[sweeper] Payment ${payment._id} statut inconnu → vérification manuelle`)
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

  // DDM+ (commande ou participation d'achat groupé) : fulfillment canonique — statut de commande,
  // grains, emails (idempotent). Jamais de notification « mission » pour un achat marketplace.
  if (!isMissionPayment(payment)) {
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
    const fulfilled = await fulfillServicePayment(payment._id)
    if (!fulfilled.accepted) return
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
