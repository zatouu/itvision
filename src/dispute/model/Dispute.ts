import mongoose, { Schema, model, models, Document } from 'mongoose'
import {
  DisputeStatus,
  DisputePriority,
  DisputeReason,
  DisputeDecision,
} from '../domain/enums'

export interface IDispute extends Document {
  reference: string
  missionId: mongoose.Types.ObjectId
  clientId: string
  providerId: mongoose.Types.ObjectId
  paymentId?: mongoose.Types.ObjectId
  status: DisputeStatus
  priority: DisputePriority
  reason: DisputeReason
  description: string
  assignedAdminId?: mongoose.Types.ObjectId
  decision?: DisputeDecision
  decisionId?: mongoose.Types.ObjectId
  openedAt: Date
  updatedAt: Date
  closedAt?: Date
  slaDeadlineAt?: Date
  escalationCount: number
  metadata?: Record<string, unknown>
}

const DisputeSchema = new Schema<IDispute>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    missionId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
    clientId: { type: String, required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', index: true },
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(DisputePriority),
      default: DisputePriority.NORMAL,
      index: true,
    },
    reason: { type: String, enum: Object.values(DisputeReason), required: true },
    description: { type: String, required: true, maxlength: 5000 },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    decision: { type: String, enum: Object.values(DisputeDecision) },
    decisionId: { type: Schema.Types.ObjectId, ref: 'DisputeDecision' },
    openedAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, index: true },
    slaDeadlineAt: { type: Date, index: true },
    escalationCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'openedAt', updatedAt: 'updatedAt' } }
)

DisputeSchema.index({ status: 1, priority: 1, openedAt: -1 })
DisputeSchema.index({ missionId: 1, status: 1 })

export default (models.Dispute as mongoose.Model<IDispute>) ||
  model<IDispute>('Dispute', DisputeSchema)
