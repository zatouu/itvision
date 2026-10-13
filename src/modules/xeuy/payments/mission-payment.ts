import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import InAppNotification from '@/lib/models/InAppNotification'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { refundEscrowPoints } from '@/lib/wallet'
import { sendPushToUser } from '@/lib/push'
import { emitGroupNotification } from '@/lib/socket-emit'

const PROVIDER_LABELS: Record<string, string> = {
  wave: 'Wave', wave_qr: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money',
}

/**
 * Paiements de missions Xeuy dans la collection Payment, partagée avec la marketplace DDM+
 * (commandes et achats groupés : `orderId`, domain 'marketplace' | 'group').
 */
export const MISSION_PAYMENT = {
  requestId: { $exists: true, $ne: null },
  orderId: { $in: [null, ''] },
  domain: { $nin: ['marketplace', 'group'] },
}

export function isMissionPayment(p: { requestId?: unknown; orderId?: unknown; domain?: string }) {
  return !!p.requestId && !p.orderId && p.domain !== 'marketplace' && p.domain !== 'group'
}

/**
 * Remboursement décidé sur un paiement de mission réellement encaissé (hors espèces) : il entre dans la file
 * Xeuy « Remboursements et retraits » et l'équipe est prévenue. Le statut 'refunded' seul ne rend pas l'argent.
 */
export async function queueClientRefund(paymentId: unknown, amount: number, reason: string): Promise<boolean> {
  if (!(amount > 0)) return false
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, ...MISSION_PAYMENT, provider: { $ne: 'cash' }, refundStatus: { $nin: ['pending', 'done'] } },
    { $set: { refundStatus: 'pending', refundReason: reason.slice(0, 300) } },
    { new: true }
  ).lean() as any
  if (!payment) return false

  const title = 'Xeuy Bi : remboursement client à effectuer'
  const message = `${amount.toLocaleString('fr-FR')} FCFA via ${PROVIDER_LABELS[payment.provider] || payment.provider} · ${reason}`.slice(0, 500)
  try {
    await InAppNotification.create({
      roles: ['ADMIN', 'SUPER_ADMIN'],
      type: 'warning',
      title,
      message,
      actionUrl: '/admin/platform/remboursements',
      metadata: { category: 'refund', domain: 'xeuy', paymentId: String(payment._id) },
    })
    emitGroupNotification('admins', { type: 'warning', title, message, data: { paymentId: String(payment._id) } })
  } catch (e) {
    console.error('[queueClientRefund] notification', e)
  }
  return true
}

/**
 * Paiement de mission Xeuy confirmé (webhook, client, balayage, admin) : attribue l'offre payée.
 * Si elle ne peut plus l'être (autre offre retenue, demande close, crédits prestataire insuffisants),
 * le paiement passe en remboursement au lieu de rester bloqué sans mission.
 */
export async function fulfillServicePayment(paymentId: unknown): Promise<{ accepted: boolean; error?: string }> {
  const payment = await Payment.findById(paymentId).lean() as any
  if (!payment || payment.status !== 'held') return { accepted: false, error: 'Paiement non encaissé' }
  if (!isMissionPayment(payment)) return { accepted: false, error: 'Paiement marketplace : hors périmètre Xeuy' }
  // Le solde se paie sur une mission déjà attribuée
  if (payment.phase === 'balance' || !payment.requestId || !payment.offerId) return { accepted: true }

  const [sr, offer] = await Promise.all([
    ServiceRequest.findById(payment.requestId),
    Offer.findById(payment.offerId),
  ])
  if (sr && offer && String(sr.selectedOfferId || '') === String(offer._id)) return { accepted: true }

  try {
    if (!sr || !offer) throw new Error('Mission ou offre introuvable')
    await acceptOfferForRequest({
      serviceRequest: sr,
      offer,
      securePayment: payment.useEscrow !== false,
      notifyClientPaymentHeld: payment.useEscrow !== false,
      amount: payment.amount,
    })
    return { accepted: true }
  } catch (err: any) {
    const reason = `Offre non attribuable : ${err?.message || 'erreur'}`
    console.error(`[fulfillServicePayment] ${payment._id} ${reason}`)
    const refunded = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'held' },
      { $set: { status: 'refunded', refundedAt: new Date(), refundedBy: 'system', refundAmount: payment.amount } },
      { new: true }
    )
    if (refunded) {
      if (payment.escrowPointsCharged > 0) {
        await refundEscrowPoints(String(payment.clientId), String(payment.requestId), payment.escrowPointsCharged).catch(() => {})
      }
      const queued = await queueClientRefund(payment._id, payment.amount, reason)
      void sendPushToUser(String(payment.clientId), {
        title: 'Paiement non utilisé',
        body: queued
          ? `Cette offre n'est plus disponible. Vos ${payment.amount.toLocaleString('fr-FR')} FCFA vont vous être remboursés.`
          : `Cette offre n'est plus disponible. Choisissez une autre offre.`,
        data: { type: 'payment:refund_pending', requestId: String(payment.requestId) },
        appType: 'consumer',
      })
    }
    return { accepted: false, error: reason }
  }
}
