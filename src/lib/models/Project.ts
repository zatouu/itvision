import mongoose, { Schema, Document } from 'mongoose'

export interface IProject extends Document {
  name: string
  description?: string
  address: string
  projectId?: string
  clientId: mongoose.Types.ObjectId
  // Optionnel: rattacher un projet à une entreprise (Client) pour visibilité multi-utilisateurs
  clientCompanyId?: mongoose.Types.ObjectId
  status: 'lead' | 'quoted' | 'negotiation' | 'approved' | 'in_progress' | 'testing' | 'completed' | 'maintenance' | 'on_hold' | 'cancelled'
  startDate: Date
  endDate?: Date | null
  // Champs UI supplémentaires
  currentPhase?: string
  progress?: number
  serviceType?: string
  clientSnapshot?: {
    company: string
    contact: string
    phone: string
    email: string
  }
  site?: {
    name: string
    address: string
    access?: string
    constraints?: string[]
    contacts?: Array<{
      name: string
      role?: string
      phone?: string
      email?: string
      availability?: string
    }>
  }
  /** @deprecated noms libres / User._id mélangés — remplacé par leadTechnicianId + technicianIds (migrate:project-team) */
  assignedTo?: string[]
  // Équipe terrain (fiches Technician) : un responsable + des membres. Facultative : l'admin pilote seul s'il le faut.
  leadTechnicianId?: mongoose.Types.ObjectId | null
  technicianIds?: mongoose.Types.ObjectId[]
  value?: number
  margin?: number
  milestones?: Array<{
    id: string
    name: string
    description?: string
    dueDate?: Date
    status: 'pending' | 'in_progress' | 'completed' | 'delayed'
    completedDate?: Date
    dependencies?: string[]
    deliverables?: string[]
    clientNotified?: boolean
  }>
  quote?: {
    id: string
    version: number
    totalHT: number
    totalTTC: number
    margin: number
    validUntil: Date
    status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected'
  } | null
  products?: Array<{
    productId: string
    name: string
    brand?: string
    model?: string
    quantity: number
    unitPrice: number
    totalPrice: number
    status: 'planned' | 'ordered' | 'received' | 'installed'
    supplier?: string
    leadTime?: string
    orderDate?: Date
    receivedDate?: Date
  }>
  timeline?: Array<{
    id: string
    date: Date
    type: 'created' | 'quoted' | 'approved' | 'started' | 'milestone' | 'issue' | 'completed'
    title: string
    description?: string
    author: string
    clientVisible: boolean
  }>
  statusHistory?: Array<{
    date: Date
    status: IProject['status']
    author?: string
    note?: string
  }>
  risks?: Array<{
    id: string
    title: string
    description?: string
    probability: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    mitigation?: string
    status: 'identified' | 'monitoring' | 'mitigated' | 'occurred'
  }>
  documents?: Array<{
    id: string
    name: string
    type: 'quote' | 'contract' | 'invoice' | 'technical' | 'photo' | 'manual'
    url: string
    uploadDate: Date
    clientVisible: boolean
  }>
  sharedNotes?: Array<{
    id: string
    author: string
    role: 'ADMIN' | 'TECHNICIAN' | 'CLIENT'
    createdAt: Date
    message: string
    clientVisible?: boolean
  }>
  nextMaintenance?: Date | null
  maintenanceWindow?: string
  metrics?: {
    tasksTotal?: number
    tasksCompleted?: number
    budgetPlanned?: number
    budgetUsed?: number
    satisfactionScore?: number
  }
  // Tableau Kanban des tâches du projet (cf. src/lib/projects/workflow.ts)
  tasks?: Array<{
    id: string
    title: string
    description?: string
    status: 'todo' | 'in_progress' | 'review' | 'done'
    priority: 'low' | 'medium' | 'high'
    assignee?: string
    assigneeId?: string
    dueDate?: Date | null
    milestoneId?: string
    order: number
    createdAt?: Date
    updatedAt?: Date
    completedAt?: Date | null
  }>
  // Journal de chantier : ce que l'équipe (ou l'admin pour son compte) consigne (cf. src/lib/projects/journal.ts)
  journal?: Array<{
    id: string
    date: Date
    kind: 'progress' | 'blocker' | 'note' | 'task' | 'report'
    message: string
    technicianId?: string
    authorName: string
    authorRole: 'ADMIN' | 'TECHNICIAN'
    onBehalfOf?: string
    taskIds?: string[]
    photos?: string[]
    hours?: number
    clientVisible: boolean
    resolvedAt?: Date | null
    reportId?: string
  }>
  lastActivityAt?: Date
  clientAccess?: boolean
  reception?: {
    requestedAt?: Date
    requestedBy?: string
    warrantyMonths?: number
    signedAt?: Date
    decision?: 'accepted' | 'reserves'
    reserves?: string
    signature?: string
    signatureName?: string
    signatureTitle?: string
    signedByUserId?: mongoose.Types.ObjectId
    ip?: string
    userAgent?: string
    warrantyEnd?: Date
    reservesLiftedAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  projectId: { type: String, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, },
  clientCompanyId: { type: Schema.Types.ObjectId, ref: 'Client', },
  status: { type: String, enum: ['lead', 'quoted', 'negotiation', 'approved', 'in_progress', 'testing', 'completed', 'maintenance', 'on_hold', 'cancelled'], default: 'lead', index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  currentPhase: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  serviceType: { type: String, default: '' },
  clientSnapshot: {
    type: {
      company: String,
      contact: String,
      phone: String,
      email: String
    },
    default: () => ({ company: '', contact: '', phone: '', email: '' })
  },
  site: {
    type: {
      name: String,
      address: String,
      access: String,
      constraints: [String],
      contacts: [{
        name: String,
        role: String,
        phone: String,
        email: String,
        availability: String
      }]
    },
    default: () => ({ name: '', address: '', access: '', constraints: [], contacts: [] })
  },
  assignedTo: [String],
  leadTechnicianId: { type: Schema.Types.ObjectId, ref: 'Technician', default: null },
  technicianIds: [{ type: Schema.Types.ObjectId, ref: 'Technician' }],
  value: { type: Number, default: 0 },
  margin: { type: Number, default: 0 },
  milestones: [{
    id: String,
    name: String,
    description: String,
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'delayed'], default: 'pending' },
    completedDate: Date,
    dependencies: [String],
    deliverables: [String],
    clientNotified: { type: Boolean, default: false },
    // Vue 360 du jalon
    checklist: [{
      label: String,
      done: { type: Boolean, default: false },
      required: { type: Boolean, default: false }
    }],
    expectedDeliverables: [{
      name: String,
      description: String,
      done: { type: Boolean, default: false },
      url: String
    }],
    fieldReport: {
      observations: String,
      issues: [String],
      satisfaction: { type: Number, min: 1, max: 10 },
      realDuration: Number, // heures
      photos: [String],
      signedBy: String,
      signedAt: Date
    },
    learnings: [{
      category: { type: String, enum: ['technical', 'process', 'client', 'safety', 'other'] },
      insight: String,
      author: String,
      createdAt: { type: Date, default: Date.now }
    }],
    phaseTemplate: String // référence vers un template de phase pour onboarding
  }],
  quote: {
    id: String,
    version: Number,
    totalHT: Number,
    totalTTC: Number,
    margin: Number,
    validUntil: Date,
    status: { type: String, enum: ['draft', 'sent', 'viewed', 'approved', 'rejected'], default: 'draft' }
    },
    products: [{
      productId: String,
      name: String,
      brand: String,
      model: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      status: { type: String, enum: ['planned', 'ordered', 'received', 'installed'], default: 'planned' },
      supplier: String,
      leadTime: String,
      orderDate: Date,
      receivedDate: Date
    }],
    timeline: [{
      id: String,
      date: Date,
      type: { type: String, enum: ['created', 'quoted', 'approved', 'started', 'milestone', 'issue', 'completed'] },
      title: String,
      description: String,
      author: String,
      clientVisible: Boolean
    }],
    statusHistory: [{
      date: Date,
      status: { type: String, enum: ['lead', 'quoted', 'negotiation', 'approved', 'in_progress', 'testing', 'completed', 'maintenance', 'on_hold', 'cancelled'] },
      author: String,
      note: String
    }],
  risks: [{
    id: String,
    title: String,
    description: String,
    probability: { type: String, enum: ['low', 'medium', 'high'] },
    impact: { type: String, enum: ['low', 'medium', 'high'] },
    mitigation: String,
    status: { type: String, enum: ['identified', 'monitoring', 'mitigated', 'occurred'], default: 'identified' }
    }],
    documents: [{
      id: String,
      name: String,
      type: { type: String, enum: ['quote', 'contract', 'invoice', 'technical', 'photo', 'manual'] },
      url: String,
      uploadDate: Date,
      clientVisible: { type: Boolean, default: false }
    }],
    sharedNotes: [{
      id: String,
      author: String,
      role: { type: String, enum: ['ADMIN', 'TECHNICIAN', 'CLIENT'], default: 'ADMIN' },
      createdAt: { type: Date, default: Date.now },
      message: String,
      clientVisible: { type: Boolean, default: false }
    }],
    nextMaintenance: Date,
    maintenanceWindow: String,
    metrics: {
      tasksTotal: Number,
      tasksCompleted: Number,
      budgetPlanned: Number,
      budgetUsed: Number,
      satisfactionScore: Number
    },
  tasks: [{
    _id: false,
    id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 4000 },
    status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignee: String,
    assigneeId: String,
    dueDate: Date,
    milestoneId: String,
    order: { type: Number, default: 0 },
    createdAt: Date,
    updatedAt: Date,
    completedAt: Date
  }],
  journal: [{
    _id: false,
    id: { type: String, required: true },
    date: { type: Date, default: Date.now },
    kind: { type: String, enum: ['progress', 'blocker', 'note', 'task', 'report'], default: 'note' },
    message: { type: String, maxlength: 4000 },
    technicianId: String,
    authorName: String,
    authorRole: { type: String, enum: ['ADMIN', 'TECHNICIAN'] },
    onBehalfOf: String,
    taskIds: [String],
    photos: [String],
    hours: Number,
    clientVisible: { type: Boolean, default: false },
    resolvedAt: Date,
    reportId: String
  }],
  lastActivityAt: Date,
  clientAccess: { type: Boolean, default: false },
  // PV de réception signé par le client depuis le portail ; la garantie court à partir de la signature
  reception: {
    requestedAt: Date,
    requestedBy: String,
    warrantyMonths: Number,
    signedAt: Date,
    decision: { type: String, enum: ['accepted', 'reserves'] },
    reserves: String,
    signature: String,
    signatureName: String,
    signatureTitle: String,
    signedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    ip: String,
    userAgent: String,
    warrantyEnd: Date,
    reservesLiftedAt: Date,
  },
}, { timestamps: true })

ProjectSchema.index({ clientId: 1, createdAt: -1 })
ProjectSchema.index({ clientCompanyId: 1, createdAt: -1 })
ProjectSchema.index({ leadTechnicianId: 1 })
ProjectSchema.index({ technicianIds: 1 })

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)
