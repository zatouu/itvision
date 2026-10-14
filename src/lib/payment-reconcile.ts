import { IScheduledTask } from '@/lib/models/ScheduledTask'
import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import { creditCashBalance } from '@/lib/wallet'
import { getScheduler } from '@/lib/visibility/scheduler'

/**
 * Handler de réconciliation paiement.
 *
 * Quand creditCashBalance() échoue après que Payment.status est passé à
 * 'released', le prestataire n'est pas crédité. Ce handler réessaie le
 * crédit via le scheduler (backoff exponentiel géré par le scheduler).
 *
 * Appelé automatiquement par le VisibilityScheduler quand une tâche
 * `payment_reconcile` est due.
 */
export async function handlePaymentReconcile(task: IScheduledTask): Promise<void> {
  await connectMongoose()

  const paymentId = task.payload?.paymentId as string | undefined
  const providerId = task.payload?.providerId as string | undefined
  const amount = task.payload?.amount as number | undefined
  const requestId = task.payload?.requestId as string | undefined

  if (!paymentId || !providerId || !amount) {
    throw new Error('Payload incomplet pour payment_reconcile')
  }

  // Paiement libéré, ou remboursé partiellement avec une part prestataire (litige)
  const payment = await Payment.findById(paymentId).lean() as any
  if (!payment) throw new Error(`Paiement ${paymentId} introuvable`)
  if (!['released', 'refunded'].includes(payment.status)) {
    return
  }

  // Idempotent (clé = paiement) : sans effet si le premier essai avait en réalité abouti
  await creditCashBalance(providerId, amount, {
    relatedMissionId: requestId,
    paymentRef: paymentId,
    description: `Reversement mission (retry réconciliation)`,
  })

  console.log(`[payment_reconcile] Crédit réussi pour payment=${paymentId} provider=${providerId} amount=${amount}`)
}

/**
 * Crédite la part prestataire d'un paiement déjà passé à 'released' (ou remboursé partiellement).
 * En cas d'échec, un réessai est planifié au lieu de laisser le prestataire impayé.
 */
export async function payProvider(payment: { _id: unknown; providerId?: unknown }, net: number, requestId: string, description: string): Promise<boolean> {
  if (!(net > 0) || !payment.providerId) return false
  try {
    await creditCashBalance(String(payment.providerId), net, { relatedMissionId: requestId, paymentRef: String(payment._id), description })
    return true
  } catch (err) {
    console.error(`[payProvider] crédit échoué payment=${payment._id}, réessai planifié`, err)
    await schedulePaymentReconcile(String(payment._id), String(payment.providerId), net, requestId)
    return false
  }
}

/**
 * Programme une tâche de réconciliation si creditCashBalance échoue
 * après que le paiement est déjà marqué 'released'.
 *
 * Appelé depuis la route /api/payments/release quand creditCashBalance throw.
 */
export async function schedulePaymentReconcile(
  paymentId: string,
  providerId: string,
  amount: number,
  requestId: string,
): Promise<string | null> {
  try {
    const scheduler = getScheduler()
    // Retry dans 30s (le scheduler gère le backoff exponentiel sur les retries suivants)
    const taskId = await scheduler.schedule({
      type: 'payment_reconcile',
      runAt: new Date(Date.now() + 30_000),
      requestId,
      payload: { paymentId, providerId, amount, requestId },
      maxAttempts: 5,
    })
    console.warn(`[payment_reconcile] Tâche planifiée pour payment=${paymentId} (retry dans 30s)`)
    return taskId
  } catch (err) {
    console.error('[payment_reconcile] Impossible de planifier la tâche:', err)
    return null
  }
}
