import mongoose, { Schema, Document } from 'mongoose'

export interface IAdminQuoteProduct {
  description: string
  quantity: number
  unitPrice: number
  taxable: boolean
  total: number
}

export interface IAdminQuoteClient {
  name: string
  address: string
  phone: string
  email: string
  rcn?: string
  ninea?: string
}

export interface IAdminQuote extends Document {
  numero: string
  date: Date
  client: IAdminQuoteClient
  // Liaison optionnelle vers un utilisateur/client entreprise pour la visibilité portail
  clientUserId?: mongoose.Types.ObjectId
  clientCompanyId?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  products: IAdminQuoteProduct[]
  subtotal: number
  brsAmount: number // 5% de déduction
  taxAmount: number
  other: number
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  sentAt?: Date
  acceptedAt?: Date
  rejectedAt?: Date
  notes?: string
  bonCommande?: string
  dateLivraison?: string
  pointExpedition?: string
  conditions?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const AdminQuoteProductSchema = new Schema<IAdminQuoteProduct>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxable: { type: Boolean, default: true },
  total: { type: Number, required: true, min: 0 }
})

const AdminQuoteClientSchema = new Schema<IAdminQuoteClient>({
  name: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  rcn: { type: String },
  ninea: { type: String }
})

const AdminQuoteSchema = new Schema<IAdminQuote>({
  numero: { type: String, required: true, unique: true, index: true },
  date: { type: Date, required: true },
  client: { type: AdminQuoteClientSchema, required: true },
  clientUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  clientCompanyId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  products: { type: [AdminQuoteProductSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  brsAmount: { type: Number, default: 0 }, // 5% de déduction
  taxAmount: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft', index: true },
  sentAt: { type: Date },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  notes: { type: String },
  bonCommande: { type: String },
  dateLivraison: { type: String },
  pointExpedition: { type: String },
  conditions: { type: String },
  createdBy: { type: String }
}, { timestamps: true })

AdminQuoteSchema.index({ createdAt: -1 })
AdminQuoteSchema.index({ 'client.name': 1 })
AdminQuoteSchema.index({ clientUserId: 1, createdAt: -1 })
AdminQuoteSchema.index({ clientCompanyId: 1, createdAt: -1 })

export default mongoose.models.AdminQuote || mongoose.model<IAdminQuote>('AdminQuote', AdminQuoteSchema)




