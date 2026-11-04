import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'
import type { PaymentProviderId } from '@/lib/payment-gateway'
import {
  notifyGroupPaymentConfirmed,
  notifyStandardOrderPaymentConfirmed
} from '@/lib/group-order-notifications'
import { syncChinaPurchaseFromGroupOrder } from '@/lib/china-purchase'
import { maybeCreditGrainsForOrder, recordReferralFirstOrder, updateTierFromBalance } from '@/lib/grains'
import { syncUserToProfiles } from '@/lib/user-profiles'
import { notifyAdmins, notifyUser } from '@/lib/notify'
import { onMarketOrderPaid } from '@/lib/market/order-paid-effects'
import { recordGroupCommission } from '@/lib/market/ambassador'
import { confirmTransportPayment } from '@/lib/market/freight-billing'

export interface ConfirmPaymentInput {
  reference: string
  amount: number
  provider: PaymentProviderId
  transactionId: string
}

export interface ConfirmPaymentResult {
  found: boolean
  changed: boolean
  type?: 'group' | 'order'
  reference: string
}

export async function confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  await connectDB()

  if (input.reference.startsWith('TR-')) return confirmTransportPayment(input)

  // ── Paiement participant d'un achat groupé ──────────────────────────────
  // Claim atomique : un seul callback passe le filtre paymentStatus ≠ 'paid',
  // ce qui rend la confirmation idempotente en concurrence.
  const groupClaim = await GroupOrder.findOneAndUpdate(
    {
      participants: {
        $elemMatch: {
          paymentReference: input.reference,
          paymentStatus: { $in: ['pending', 'partial'] }
        }
      }
    },
    {
      $inc: { 'participants.$.paidAmount': input.amount },
      $set: {
        'participants.$.paymentMethod': input.provider,
        'participants.$.transactionId': input.transactionId,
        'participants.$.paymentUpdatedAt': new Date()
      }
    },
    { new: true }
  )

  if (groupClaim) {
    const participant = groupClaim.participants.find(
      (p: any) => p.paymentReference === input.reference
    )
    if (!participant) {
      return { found: false, changed: false, reference: input.reference }
    }

    const expected = Number(participant.totalAmount || 0)
    const isFullyPaid = expected > 0 ? Number(participant.paidAmount || 0) >= expected : true

    if (isFullyPaid) {
      participant.paymentStatus = 'paid'
      if (Number(participant.paidAmount) > expected) {
        console.error(`[fulfillment] SURPAIEMENT groupe ${groupClaim.groupId}: ${participant.paidAmount} > ${expected} (${input.reference})`)
      }
    } else {
      participant.paymentStatus = 'partial'
      console.error(`[fulfillment] SOUS-PAIEMENT groupe ${groupClaim.groupId}: ${participant.paidAmount} < ${expected} (${input.reference})`)
    }

    if ((groupClaim as any).chinaPurchase?.purchaseId) {
      const chinaPurchase = await syncChinaPurchaseFromGroupOrder(groupClaim)
      if (chinaPurchase) {
        const groupOrderWithChinaPurchase = groupClaim as any
        groupOrderWithChinaPurchase.chinaPurchase = chinaPurchase
      }
    }

    await groupClaim.save()

    if (groupClaim.status === 'cancelled') {
      void notifyAdmins({
        type: 'warning',
        title: 'Paiement reçu sur un achat groupé annulé',
        message: `${groupClaim.groupId} : ${Math.round(input.amount).toLocaleString('fr-FR')} FCFA reçus (${input.provider}, réf. ${input.reference}) — à rembourser.`,
        actionUrl: '/admin/marketplace/remboursements',
        metadata: { groupId: groupClaim.groupId, reference: input.reference, amount: input.amount },
      })
      return { found: true, changed: true, type: 'group', reference: input.reference }
    }

    await notifyGroupPaymentConfirmed(participant, groupClaim, input.transactionId)

    if (participant.paymentStatus === 'paid') {
      await recordGroupCommission(groupClaim, participant).catch((err) =>
        console.error('[fulfillment] commission ambassadeur groupe:', err)
      )
    }

    return { found: true, changed: true, type: 'group', reference: input.reference }
  }

  // Élément déjà payé (ou référence appartenant à un groupe) ?
  const groupOrder = await GroupOrder.findOne({
    'participants.paymentReference': input.reference
  }).lean()
  if (groupOrder) {
    return { found: true, changed: false, type: 'group', reference: input.reference }
  }

  // ── Commande standard ───────────────────────────────────────────────────
  const standardOrder = await Order.findOneAndUpdate(
    { orderId: input.reference, paymentStatus: { $ne: 'completed' } },
    {
      $set: {
        paymentStatus: 'completed',
        paymentMethod: input.provider,
        transactionId: input.transactionId
      }
    },
    { new: true }
  ).lean() as any

  if (!standardOrder) {
    const exists = await Order.exists({ orderId: input.reference })
    return exists
      ? { found: true, changed: false, type: 'order', reference: input.reference }
      : { found: false, changed: false, reference: input.reference }
  }

  // Une commande annulée entre-temps n'est pas réactivée (stock déjà restitué) : l'argent reçu est à rembourser,
  // sans email « prise en charge » ni grains
  await Order.updateOne(
    { _id: standardOrder._id, status: 'pending' },
    { $set: { status: 'confirmed', confirmedAt: new Date() } }
  )
  if (standardOrder.status === 'cancelled') {
    console.error(`[fulfillment] Paiement reçu pour une commande annulée ${input.reference} — remboursement à traiter`)
    await Order.updateOne(
      { _id: standardOrder._id, refundStatus: { $nin: ['pending', 'done'] } },
      { $set: { refundStatus: 'pending', refundAmount: input.amount } }
    )
    void notifyAdmins({
      type: 'warning',
      title: 'Paiement reçu sur une commande annulée',
      message: `Commande ${input.reference} : ${Math.round(input.amount).toLocaleString('fr-FR')} FCFA reçus (${input.provider}) — à rembourser.`,
      actionUrl: '/admin/marketplace/remboursements',
      metadata: { orderId: input.reference, amount: input.amount },
    })
    if (standardOrder.clientId) {
      void notifyUser(String(standardOrder.clientId), {
        type: 'warning',
        title: `Commande ${input.reference} annulée`,
        message: 'Votre paiement est arrivé après l\'annulation de la commande. Il vous sera remboursé, notre équipe vous contacte.',
        actionUrl: `/commandes/${input.reference}`,
      })
    }
    return { found: true, changed: true, type: 'order', reference: input.reference }
  }

  // Sous-paiement : la facture PayDunya ne se complète qu'à montant plein,
  // mais on vérifie — une anomalie doit être visible, pas silencieuse.
  const expectedTotal = Number(standardOrder.total || 0)
  if (expectedTotal > 0 && input.amount < expectedTotal) {
    console.error(`[fulfillment] SOUS-PAIEMENT commande ${input.reference}: ${input.amount} < ${expectedTotal}`)
    const note = `[PAYMENT] Sous-paiement détecté : ${input.amount} F reçus / ${expectedTotal} F attendus (${input.provider}, tx ${input.transactionId})`
    await Order.updateOne(
      { _id: standardOrder._id },
      { $set: { internalNotes: standardOrder.internalNotes ? `${standardOrder.internalNotes}\n${note}` : note } }
    )
  }

  await notifyStandardOrderPaymentConfirmed(standardOrder, input.transactionId)

  // Grains de fidélité + parrainage : crédités uniquement sur paiement confirmé
  if (standardOrder.clientId) {
    try {
      const userId = String(standardOrder.clientId)
      await maybeCreditGrainsForOrder(userId, standardOrder._id, standardOrder.total)
      await recordReferralFirstOrder(userId, standardOrder._id)
      await updateTierFromBalance(userId)
      await syncUserToProfiles(userId)
    } catch (grainsErr) {
      console.error('[fulfillment] Erreur crédit grains commande payée:', grainsErr)
    }
  }

  await onMarketOrderPaid(standardOrder)

  return { found: true, changed: true, type: 'order', reference: input.reference }
}
