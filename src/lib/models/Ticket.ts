import mongoose, { Schema, Document } from 'mongoose'

export interface ITicketAttachment {
  name: string
  url: string
  type?: string
  size?: number
  uploadedAt: Date
  uploadedBy: mongoose.Types.ObjectId
}

export interface ITicketMessage {
  authorId: mongoose.Types.ObjectId
  authorRole: 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  message: string
  createdAt: Date
  internal?: boolean
  attachments?: ITicketAttachment[]
  statusSnapshot?: string
}

export interface ITicketHistory {
  authorId: mongoose.Types.ObjectId
  authorRole: 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  action: 'status_change' | 'assignment' | 'note' | 'message'
  payload?: Record<string, unknown>
  createdAt: Date
}

export interface ITicket extends Document {
  projectId?: mongoose.Types.ObjectId
  clientId: mongoose.Types.ObjectId
  assignedTo: mongoose.Types.ObjectId[]
  watchers: mongoose.Types.ObjectId[]
  title: string
  category: 'incident' | 'request' | 'change' | 'general' | 'technical' | 'billing' | 'urgent'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed' | 'waiting'
  channel: 'client_portal' | 'admin' | 'automation'
  tags: string[]
  source?: string
  lastResponseAt?: Date
  resolvedAt?: Date
  sla: {
    targetHours: number
    startedAt: Date
    deadlineAt: Date
    breached: boolean
    resolvedAt?: Date
  }
  messages: ITicketMessage[]
  history: ITicketHistory[]
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const TicketAttachmentSchema = new Schema<ITicketAttachment>({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
})

const TicketMessageSchema = new Schema<ITicketMessage>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String, enum: ['CLIENT', 'TECHNICIAN', 'ADMIN'], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  internal: { type: Boolean, default: false },
  attachments: { type: [TicketAttachmentSchema], default: [] },
  statusSnapshot: { type: String }
})

const TicketHistorySchema = new Schema<ITicketHistory>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String, enum: ['CLIENT', 'TECHNICIAN', 'ADMIN'], required: true },
  action: { type: String, enum: ['status_change', 'assignment', 'note', 'message'], required: true },
  payload: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
})

const TicketSchema = new Schema<ITicket>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: false, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String, required: true },
  category: { type: String, enum: ['incident', 'request', 'change', 'general', 'technical', 'billing', 'urgent'], default: 'request', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  status: { type: String, enum: ['open', 'in_progress', 'waiting_client', 'resolved', 'closed', 'waiting'], default: 'open', index: true },
  channel: { type: String, enum: ['client_portal', 'admin', 'automation'], default: 'client_portal' },
  tags: { type: [String], default: [] },
  source: { type: String },
  lastResponseAt: { type: Date },
  resolvedAt: { type: Date },
  sla: {
    targetHours: { type: Number, default: 48 },
    startedAt: { type: Date, default: Date.now },
    deadlineAt: { type: Date },
    breached: { type: Boolean, default: false },
    resolvedAt: { type: Date }
  },
  messages: { type: [TicketMessageSchema], default: [] },
  history: { type: [TicketHistorySchema], default: [] },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true })

TicketSchema.pre('validate', function(next) {
  // Initialiser SLA si nécessaire
  if (!this.sla) {
    this.sla = {} as any
  }
  if (!this.sla.startedAt) {
    this.sla.startedAt = new Date()
  }
  if (!this.sla.targetHours) {
    this.sla.targetHours = 48
  }
  if (!this.sla.deadlineAt) {
    const deadline = new Date(this.sla.startedAt)
    deadline.setHours(deadline.getHours() + this.sla.targetHours)
    this.sla.deadlineAt = deadline
  }
  
  // Réparer automatiquement les messages existants sans authorId/authorRole
  if (this.messages && Array.isArray(this.messages)) {
    this.messages = this.messages.map((msg: any) => {
      if (!msg.authorId && this.clientId) {
        msg.authorId = this.clientId
      }
      if (!msg.authorRole) {
        msg.authorRole = 'CLIENT'
      }
      if (!msg.createdAt) {
        msg.createdAt = new Date()
      }
      return msg
    })
  }
  
  // Initialiser les tableaux vides si nécessaires
  if (!this.messages) this.messages = []
  if (!this.history) this.history = []
  if (!this.assignedTo) this.assignedTo = []
  if (!this.watchers) this.watchers = []
  if (!this.tags) this.tags = []
  
  next()
})

TicketSchema.index({ projectId: 1, createdAt: -1 })
TicketSchema.index({ clientId: 1, createdAt: -1 })
TicketSchema.index({ status: 1, priority: 1 })
TicketSchema.index({ assignedTo: 1, status: 1 })

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema)
