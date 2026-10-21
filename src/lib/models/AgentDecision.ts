import mongoose, { Schema, Document } from 'mongoose'

export interface IAgentDecision extends Document {
  type: string
  refId: string
  runId: string
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved'
  proposal: Record<string, unknown>
  decidedBy?: string
  decidedAt?: Date
  adminNote?: string
  createdAt: Date
  updatedAt: Date
}

const AgentDecisionSchema = new Schema<IAgentDecision>({
  type: { type: String, required: true, index: true },
  refId: { type: String, required: true, index: true },
  runId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'auto_approved'], default: 'pending', index: true },
  proposal: { type: Schema.Types.Mixed, required: true },
  decidedBy: { type: String },
  decidedAt: { type: Date },
  adminNote: { type: String },
}, { timestamps: true })

AgentDecisionSchema.index({ status: 1, type: 1 })

export default mongoose.models.AgentDecision || mongoose.model<IAgentDecision>('AgentDecision', AgentDecisionSchema)
