import mongoose, { Schema, model, models, Document } from 'mongoose'
import { DisputeDecision } from '../domain/enums'

export interface IDisputeDecision extends Document {
  disputeId: mongoose.Types.ObjectId
  decision: DisputeDecision
  reason: string
  adminId: mongoose.Types.ObjectId
  amount?: number
  createdAt: Date
  isFinal: boolean
}

const DisputeDecisionSchema = new Schema<IDisputeDecision>(
  {
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    decision: { type: String, enum: Object.values(DisputeDecision), required: true },
    reason: { type: String, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, min: 0 },
    createdAt: { type: Date, default: Date.now },
    isFinal: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
)

DisputeDecisionSchema.index({ disputeId: 1, createdAt: -1 })

export default (models.DisputeDecision as mongoose.Model<IDisputeDecision>) ||
  model<IDisputeDecision>('DisputeDecision', DisputeDecisionSchema)
