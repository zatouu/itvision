import Payment from '@/lib/models/Payment'
import TopupPayment from '@/lib/models/TopupPayment'

// Transition atomique depuis 'pending' : renvoie null si un autre flux (webhook, client, admin) l'a déjà traité.
export function claimPendingPayment(paymentId: unknown, set: Record<string, unknown>) {
  return Payment.findOneAndUpdate({ _id: paymentId, status: 'pending' }, { $set: set }, { new: true })
}

// Idem pour les recharges wallet : garantit un seul crédit de points par recharge.
export function claimPendingTopup(topupId: unknown, set: Record<string, unknown>) {
  return TopupPayment.findOneAndUpdate({ _id: topupId, status: 'pending' }, { $set: set }, { new: true })
}
