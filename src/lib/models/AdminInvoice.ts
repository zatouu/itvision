import mongoose, { Schema, Document } from 'mongoose'

export interface IAdminInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
  productId?: string
}

export interface IAdminInvoiceClient {
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  taxId?: string
}

export interface IAdminInvoice extends Document {
  numero: string
  date: Date
  dueDate?: Date
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

  // Liaison optionnelle vers un utilisateur/client entreprise pour la visibilité portail
  clientUserId?: mongoose.Types.ObjectId
  clientCompanyId?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId

  client: IAdminInvoiceClient
  items: IAdminInvoiceItem[]

  subtotal: number
  taxRate: number
  taxAmount: number
  total: number

  notes?: string
  terms?: string

  quoteId?: string
  paymentMethod?: string
  paymentDate?: string

  sentAt?: Date
  paidAt?: Date

  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const AdminInvoiceItemSchema = new Schema<IAdminInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  category: { type: String },
  productId: { type: String }
})

const AdminInvoiceClientSchema = new Schema<IAdminInvoiceClient>({
  name: { type: String, required: true },
  company: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  postalCode: { type: String },
  taxId: { type: String }
})

const AdminInvoiceSchema = new Schema<IAdminInvoice>({
  numero: { type: String, required: true, unique: true, index: true },
  date: { type: Date, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft', index: true },

  clientUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  clientCompanyId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },

  client: { type: AdminInvoiceClientSchema, required: true },
  items: { type: [AdminInvoiceItemSchema], default: [] },

  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  notes: { type: String },
  terms: { type: String },

  quoteId: { type: String },
  paymentMethod: { type: String },
  paymentDate: { type: String },

  sentAt: { type: Date },
  paidAt: { type: Date },

  createdBy: { type: String }
}, { timestamps: true })

AdminInvoiceSchema.index({ createdAt: -1 })
AdminInvoiceSchema.index({ 'client.name': 1 })
AdminInvoiceSchema.index({ 'client.company': 1 })
AdminInvoiceSchema.index({ clientUserId: 1, createdAt: -1 })
AdminInvoiceSchema.index({ clientCompanyId: 1, createdAt: -1 })

export default mongoose.models.AdminInvoice || mongoose.model<IAdminInvoice>('AdminInvoice', AdminInvoiceSchema)
