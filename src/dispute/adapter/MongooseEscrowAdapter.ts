import mongoose from 'mongoose'
import Payment from '@/lib/models/Payment'
import type { EscrowPort } from '../port/EscrowPort'

export class MongooseEscrowAdapter implements EscrowPort {
  async getPaymentIdForMission(missionId: string): Promise<string | null> {
    if (!mongoose.isValidObjectId(missionId)) return null
    const payment = (await Payment.findOne({ requestId: missionId, useEscrow: true })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean()) as any
    return payment ? String(payment._id) : null
  }

  // Le gel passe par le verrou de la mission (escrowLocked) : remettre un paiement en 'held'
  // pourrait réactiver un paiement déjà reversé (double reversement) ou jamais encaissé.
  async holdPayment(_paymentId: string): Promise<void> {}

  // Les mouvements d'argent d'un litige (reversement, remboursement, commission) sont faits
  // par mission-lifecycle.resolveDispute : changer seulement le statut ferait disparaître les fonds.
  async releasePayment(_paymentId: string): Promise<void> {
    throw new Error('Utiliser mission-lifecycle.resolveDispute pour libérer un séquestre')
  }

  async refundPayment(_paymentId: string, _amount?: number): Promise<void> {
    throw new Error('Utiliser mission-lifecycle.resolveDispute pour rembourser un séquestre')
  }
}
