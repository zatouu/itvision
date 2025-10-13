import mongoose, { Schema, Document } from 'mongoose'

export interface ITicketMessage {
  authorId: mongoose.Types.ObjectId
  authorRole: 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  message: string
  createdAt: Date
}

export interface ITicket extends Document {
  projectId: mongoose.Types.ObjectId
  clientId: mongoose.Types.ObjectId
  title: string
  category: 'incident' | 'request' | 'change'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed'
  sla: {
    targetHours: number
    startedAt: Date
    deadlineAt: Date
    breached: boolean
    resolvedAt?: Date
  }
  messages: ITicketMessage[]
  createdAt: Date
  updatedAt: Date
}

const TicketMessageSchema = new Schema<ITicketMessage>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String, enum: ['CLIENT', 'TECHNICIAN', 'ADMIN'], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const TicketSchema = new Schema<ITicket>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['incident', 'request', 'change'], default: 'incident', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  status: { type: String, enum: ['open', 'in_progress', 'waiting_client', 'resolved', 'closed'], default: 'open', index: true },
  sla: {
    targetHours: { type: Number, default: 48 },
    startedAt: { type: Date, default: Date.now },
    deadlineAt: { type: Date, required: true },
    breached: { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  messages: { type: [TicketMessageSchema], default: [] },
}, { timestamps: true })

TicketSchema.pre('validate', function(next) {
  if (!this.sla || !this.sla.startedAt || !this.sla.targetHours) {
    this.sla = this.sla || ({} as any)
    this.sla.startedAt = this.sla.startedAt || new Date()
    this.sla.targetHours = this.sla.targetHours || 48
  }
  if (!this.sla.deadlineAt) {
    const deadline = new Date(this.sla.startedAt)
    deadline.setHours(deadline.getHours() + this.sla.targetHours)
    this.sla.deadlineAt = deadline
  }
  next()
})

// Index pour pagination efficace par projet
TicketSchema.index({ projectId: 1, createdAt: -1 })

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema)
