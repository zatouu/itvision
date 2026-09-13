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
    await notifyGroupPaymentConfirmed(participant, groupClaim, input.transactionId)

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

  return { found: true, changed: true, type: 'order', reference: input.reference }
}
