import mongoose, { Schema, Document } from 'mongoose'

export interface IAgentRun extends Document {
  threadId: string
  graph: string
  refId: string
  status: 'running' | 'waiting_human' | 'done' | 'failed'
  llmUsed: boolean
  durationMs?: number
  error?: string
  createdAt: Date
  updatedAt: Date
}

const AgentRunSchema = new Schema<IAgentRun>({
  threadId: { type: String, required: true, unique: true, index: true },
  graph: { type: String, required: true },
  refId: { type: String, required: true, index: true },
  status: { type: String, enum: ['running', 'waiting_human', 'done', 'failed'], default: 'running', index: true },
  llmUsed: { type: Boolean, default: false },
  durationMs: { type: Number },
  error: { type: String },
}, { timestamps: true })

export default mongoose.models.AgentRun || mongoose.model<IAgentRun>('AgentRun', AgentRunSchema)
