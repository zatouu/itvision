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

  async holdPayment(paymentId: string): Promise<void> {
    if (!mongoose.isValidObjectId(paymentId)) return
    await Payment.updateOne(
      { _id: paymentId },
      { $set: { status: 'held', heldAt: new Date() } }
    )
  }

  async releasePayment(paymentId: string): Promise<void> {
    if (!mongoose.isValidObjectId(paymentId)) return
    await Payment.updateOne(
      { _id: paymentId },
      { $set: { status: 'released', releasedAt: new Date() } }
    )
  }

  async refundPayment(paymentId: string, amount?: number): Promise<void> {
    if (!mongoose.isValidObjectId(paymentId)) return
    const update: any = { $set: { status: 'refunded', refundedAt: new Date() } }
    if (amount) update.$set.refundAmount = amount
    await Payment.updateOne({ _id: paymentId }, update)
  }
}
