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

  const groupOrder = await GroupOrder.findOne({
    'participants.paymentReference': input.reference
  })

  if (groupOrder) {
    const participant = groupOrder.participants.find(
      (p: any) => p.paymentReference === input.reference
    )

    if (!participant) {
      return { found: false, changed: false, reference: input.reference }
    }

    if (participant.paymentStatus === 'paid') {
      return { found: true, changed: false, type: 'group', reference: input.reference }
    }

    participant.paymentStatus = 'paid'
    participant.paidAmount = input.amount
    participant.paymentMethod = input.provider
    participant.transactionId = input.transactionId
    participant.paymentUpdatedAt = new Date()

    if ((groupOrder as any).chinaPurchase?.purchaseId) {
      const chinaPurchase = await syncChinaPurchaseFromGroupOrder(groupOrder)
      if (chinaPurchase) {
        const groupOrderWithChinaPurchase = groupOrder as any
        groupOrderWithChinaPurchase.chinaPurchase = chinaPurchase
      }
    }

    await groupOrder.save()
    await notifyGroupPaymentConfirmed(participant, groupOrder, input.transactionId)

    return { found: true, changed: true, type: 'group', reference: input.reference }
  }

  const standardOrder = await Order.findOne({ orderId: input.reference })

  if (standardOrder) {
    if (standardOrder.paymentStatus === 'completed') {
      return { found: true, changed: false, type: 'order', reference: input.reference }
    }

    standardOrder.paymentStatus = 'completed'
    standardOrder.paymentMethod = input.provider
    standardOrder.transactionId = input.transactionId

    await standardOrder.save()
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

  return { found: false, changed: false, reference: input.reference }
}
