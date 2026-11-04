import mongoose, { Schema, Document } from 'mongoose'

export interface IAdminInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  netUnitPrice?: number
  totalPrice: number
  category?: string
  productId?: string
  expenseId?: string
}

export interface IAdminInvoicePayment {
  _id?: mongoose.Types.ObjectId
  amount: number
  date: Date
  method?: string
  reference?: string
  note?: string
  recordedBy?: string
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

export interface IAdminInvoiceAttachment {
  name: string
  url: string
  type: string
  size: number
  uploadedAt: Date
  uploadedBy?: string
  category?: string // 'cheque', 'bon_commande', 'recu', 'contrat', 'autre'
}

export interface IAdminInvoice extends Document {
  numero: string
  date: Date
  dueDate?: Date
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'

  // Liaison optionnelle vers un utilisateur/client entreprise pour la visibilité portail
  clientUserId?: mongoose.Types.ObjectId
  clientCompanyId?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId

  client: IAdminInvoiceClient
  items: IAdminInvoiceItem[]

  subtotal: number
  taxRegime?: 'brs' | 'tva' | 'none'
  brsThreshold?: number
  taxRate: number
  taxAmount: number
  brsAmount?: number
  total: number

  notes?: string
  terms?: string

  quoteId?: string
  maintenanceContractId?: mongoose.Types.ObjectId
  billingPeriodStart?: Date
  billingPeriodEnd?: Date
  paymentMethod?: string
  paymentDate?: string

  sentAt?: Date
  paidAt?: Date

  payments?: IAdminInvoicePayment[]
  amountPaid?: number
  creditedAmount?: number
  creditNoteIds?: mongoose.Types.ObjectId[]
  reminders?: Array<{ level: string; sentAt: Date; to?: string }>

  attachments?: IAdminInvoiceAttachment[]

  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const AdminInvoiceItemSchema = new Schema<IAdminInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  netUnitPrice: { type: Number, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  category: { type: String },
  productId: { type: String },
  // Dépense refacturée (Expense.billedToInvoiceId pointe sur cette facture)
  expenseId: { type: String }
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

const AdminInvoiceAttachmentSchema = new Schema<IAdminInvoiceAttachment>({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String },
  category: { type: String }
})

const AdminInvoicePaymentSchema = new Schema<IAdminInvoicePayment>({
  amount: { type: Number, required: true, min: 1 },
  date: { type: Date, required: true },
  method: { type: String },
  reference: { type: String },
  note: { type: String },
  recordedBy: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } })

const AdminInvoiceSchema = new Schema<IAdminInvoice>({
  numero: { type: String, required: true, unique: true, index: true },
  date: { type: Date, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'], default: 'draft', index: true },

  clientUserId: { type: Schema.Types.ObjectId, ref: 'User', },
  clientCompanyId: { type: Schema.Types.ObjectId, ref: 'Client', },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },

  client: { type: AdminInvoiceClientSchema, required: true },
  items: { type: [AdminInvoiceItemSchema], default: [] },

  subtotal: { type: Number, default: 0 },
  // BRS et TVA s'excluent : un seul régime par facture
  taxRegime: { type: String, enum: ['brs', 'tva', 'none'] },
  brsThreshold: { type: Number, default: 25000, min: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  // Retenue à la source (BRS 5 % sur main-d'œuvre) : total = net à payer
  brsAmount: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0 },

  notes: { type: String },
  terms: { type: String },

  quoteId: { type: String },
  maintenanceContractId: { type: Schema.Types.ObjectId, ref: 'MaintenanceContract' },
  billingPeriodStart: { type: Date },
  billingPeriodEnd: { type: Date },
  paymentMethod: { type: String },
  paymentDate: { type: String },

  sentAt: { type: Date },
  paidAt: { type: Date },

  // Encaissements (acomptes, soldes) : la trésorerie les compte à leur date
  payments: { type: [AdminInvoicePaymentSchema], default: [] },
  amountPaid: { type: Number, default: 0, min: 0 },
  // Montant annulé par avoir(s) : reste dû = total - creditedAmount - amountPaid
  creditedAmount: { type: Number, default: 0, min: 0 },
  creditNoteIds: [{ type: Schema.Types.ObjectId, ref: 'CreditNote' }],
  // Relances envoyées (un niveau n'est envoyé qu'une fois)
  reminders: [{ level: { type: String }, sentAt: { type: Date }, to: { type: String }, _id: false }],

  attachments: { type: [AdminInvoiceAttachmentSchema], default: [] },

  createdBy: { type: String }
}, { timestamps: true })

AdminInvoiceSchema.index({ createdAt: -1 })
AdminInvoiceSchema.index({ 'client.name': 1 })
AdminInvoiceSchema.index({ 'client.company': 1 })
AdminInvoiceSchema.index({ clientUserId: 1, createdAt: -1 })
AdminInvoiceSchema.index({ clientCompanyId: 1, createdAt: -1 })
AdminInvoiceSchema.index({ 'payments.date': 1 })
// Une seule facture par échéance de contrat (facturation récurrente)
AdminInvoiceSchema.index(
  { maintenanceContractId: 1, billingPeriodStart: 1 },
  { unique: true, partialFilterExpression: { maintenanceContractId: { $exists: true }, billingPeriodStart: { $exists: true } } }
)

export default mongoose.models.AdminInvoice || mongoose.model<IAdminInvoice>('AdminInvoice', AdminInvoiceSchema)
