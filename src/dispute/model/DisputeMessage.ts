import mongoose, { Schema, model, models, Document } from 'mongoose'
import { ActorType } from '../domain/enums'

export interface IDisputeMessage extends Document {
  disputeId: mongoose.Types.ObjectId
  authorType: ActorType
  authorId: mongoose.Types.ObjectId
  message: string
  createdAt: Date
  readAt?: Date
}

const DisputeMessageSchema = new Schema<IDisputeMessage>(
  {
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    authorType: { type: String, enum: Object.values(ActorType), required: true },
    authorId: { type: Schema.Types.ObjectId, required: true, index: true },
    message: { type: String, required: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
)

DisputeMessageSchema.index({ disputeId: 1, createdAt: -1 })

export default (models.DisputeMessage as mongoose.Model<IDisputeMessage>) ||
  model<IDisputeMessage>('DisputeMessage', DisputeMessageSchema)
