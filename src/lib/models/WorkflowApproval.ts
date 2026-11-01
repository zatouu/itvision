import mongoose, { Schema, Document } from 'mongoose'

export type WorkflowApprovalType = 'deposit_invoice' | 'project_budget' | 'journal_progress' | 'balance_invoice'

/**
 * Validation en attente du pilote (envoyée par mail avec liens signés).
 * Le jeton est le seul secret : il n'autorise que CETTE décision, une seule fois.
 */
export interface IWorkflowApproval extends Document {
  type: WorkflowApprovalType
  token: string
  status: 'pending' | 'approved' | 'rejected' | 'failed' | 'expired'
  title: string
  summary: string
  /** Lignes lisibles dans le mail et la page de confirmation. */
  lines: Array<{ label: string; value?: string }>
  payload: Record<string, unknown>
  projectId?: mongoose.Types.ObjectId
  quoteId?: mongoose.Types.ObjectId
  /** Clé d'unicité : une seule validation en attente par sujet. */
  dedupeKey: string
  sentTo?: string
  emailSent?: boolean
  decidedAt?: Date
  decidedVia?: 'email' | 'admin'
  decidedBy?: string
  result?: string
  error?: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const WorkflowApprovalSchema = new Schema<IWorkflowApproval>({
  type: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'failed', 'expired'], default: 'pending', index: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  lines: { type: [{ label: String, value: String, _id: false }], default: [] },
  payload: { type: Schema.Types.Mixed, default: {} },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  quoteId: { type: Schema.Types.ObjectId, ref: 'AdminQuote' },
  dedupeKey: { type: String, required: true, index: true },
  sentTo: String,
  emailSent: Boolean,
  decidedAt: Date,
  decidedVia: { type: String, enum: ['email', 'admin'] },
  decidedBy: String,
  result: String,
  error: String,
  expiresAt: { type: Date, required: true },
}, { timestamps: true })

WorkflowApprovalSchema.index({ dedupeKey: 1, status: 1 })

export default mongoose.models.WorkflowApproval || mongoose.model<IWorkflowApproval>('WorkflowApproval', WorkflowApprovalSchema)
