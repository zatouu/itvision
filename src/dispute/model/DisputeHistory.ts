import mongoose, { Schema, model, models, Document } from 'mongoose'
import { ActorType } from '../domain/enums'

export interface IDisputeHistory extends Document {
  disputeId: mongoose.Types.ObjectId
  action: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  performedBy: mongoose.Types.ObjectId
  performedByType: ActorType
  performedAt: Date
  metadata?: Record<string, unknown>
}

const DisputeHistorySchema = new Schema<IDisputeHistory>(
  {
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    action: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    performedBy: { type: Schema.Types.ObjectId, required: true, index: true },
    performedByType: { type: String, enum: Object.values(ActorType), required: true },
    performedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'performedAt', updatedAt: false } }
)

DisputeHistorySchema.index({ disputeId: 1, performedAt: -1 })
DisputeHistorySchema.index({ action: 1, performedAt: -1 })

export default (models.DisputeHistory as mongoose.Model<IDisputeHistory>) ||
  model<IDisputeHistory>('DisputeHistory', DisputeHistorySchema)
