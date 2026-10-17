import mongoose, { Schema, Document } from 'mongoose'

export interface IAgentJob extends Document {
  type: string
  refId: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'waiting_human'
  attempts: number
  runAfter: Date
  heartbeatAt?: Date
  payload?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
  createdAt: Date
  updatedAt: Date
}

const AgentJobSchema = new Schema<IAgentJob>({
  type: { type: String, required: true, index: true },
  refId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'running', 'done', 'failed', 'waiting_human'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  runAfter: { type: Date, default: Date.now },
  heartbeatAt: { type: Date },
  payload: { type: Schema.Types.Mixed },
  result: { type: Schema.Types.Mixed },
  error: { type: String },
}, { timestamps: true })

AgentJobSchema.index({ status: 1, runAfter: 1 })
AgentJobSchema.index({ status: 1, type: 1, heartbeatAt: 1 })

export default mongoose.models.AgentJob || mongoose.model<IAgentJob>('AgentJob', AgentJobSchema)
