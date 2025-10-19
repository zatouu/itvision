import mongoose, { Schema, Document } from 'mongoose'

export interface IProject extends Document {
  name: string
  description?: string
  address: string
  clientId: mongoose.Types.ObjectId
  status: 'lead' | 'quoted' | 'negotiation' | 'approved' | 'in_progress' | 'testing' | 'completed' | 'maintenance' | 'on_hold'
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
  }
  assignedTo?: string[]
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
  clientAccess?: boolean
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['lead', 'quoted', 'negotiation', 'approved', 'in_progress', 'testing', 'completed', 'maintenance', 'on_hold'], default: 'lead', index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  currentPhase: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  serviceType: { type: String, default: '' },
  clientSnapshot: {
    company: String,
    contact: String,
    phone: String,
    email: String
  },
  site: {
    name: String,
    address: String,
    access: String,
    constraints: [String]
  },
  assignedTo: [String],
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
    clientNotified: { type: Boolean, default: false }
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
  clientAccess: { type: Boolean, default: false },
}, { timestamps: true })

ProjectSchema.index({ clientId: 1, createdAt: -1 })

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)
