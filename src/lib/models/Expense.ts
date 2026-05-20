import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IExpenseAttachment {
  name: string
  url: string
  type?: string
  size?: number
  uploadedAt?: Date
  uploadedBy?: string
  category?: string // 'facture_fournisseur', 'recu', 'bon_commande', 'autre'
}

export type ExpenseCategory =
  | 'achat_materiel'
  | 'sous_traitance'
  | 'transport'
  | 'salaire'
  | 'loyer'
  | 'services'
  | 'taxes'
  | 'commissions'
  | 'marketing'
  | 'logistique'
  | 'douane'
  | 'autre'

export type ExpensePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled'

export interface IExpense extends Document {
  numero: string
  label: string
  description?: string

  category: ExpenseCategory
  subCategory?: string

  // Liaison projet (optionnelle)
  projectId?: Types.ObjectId
  projectName?: string

  // Liaison client (optionnelle, pour dépenses refacturables)
  clientCompanyId?: Types.ObjectId

  // Fournisseur
  supplier?: {
    name?: string
    email?: string
    phone?: string
    taxId?: string
  }

  // Montants
  amountHT: number
  taxRate: number
  taxAmount: number
  amountTTC: number
  currency: string

  // Paiement
  paymentStatus: ExpensePaymentStatus
  paymentMethod?: string // 'virement', 'especes', 'cheque', 'mobile_money', 'carte', 'autre'
  paidAmount: number
  paidAt?: Date
  dueDate?: Date

  // Refacturation (récupérable côté client)
  isBillable: boolean
  billedToInvoiceId?: Types.ObjectId

  // Dates
  expenseDate: Date

  // Pièces jointes
  attachments?: IExpenseAttachment[]

  notes?: string

  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const ExpenseAttachmentSchema = new Schema<IExpenseAttachment>({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String },
  category: { type: String }
}, { _id: false })

const ExpenseSchema = new Schema<IExpense>({
  numero: { type: String, required: true, unique: true, index: true },
  label: { type: String, required: true },
  description: { type: String },

  category: {
    type: String,
    enum: [
      'achat_materiel', 'sous_traitance', 'transport', 'salaire', 'loyer',
      'services', 'taxes', 'commissions', 'marketing', 'logistique', 'douane', 'autre'
    ],
    required: true,
    index: true
  },
  subCategory: { type: String },

  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  projectName: { type: String },

  clientCompanyId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },

  supplier: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    taxId: { type: String }
  },

  amountHT: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  amountTTC: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'FCFA' },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'cancelled'],
    default: 'unpaid',
    index: true
  },
  paymentMethod: { type: String },
  paidAmount: { type: Number, default: 0 },
  paidAt: { type: Date },
  dueDate: { type: Date },

  isBillable: { type: Boolean, default: false, index: true },
  billedToInvoiceId: { type: Schema.Types.ObjectId, ref: 'AdminInvoice' },

  expenseDate: { type: Date, required: true, index: true },

  attachments: { type: [ExpenseAttachmentSchema], default: [] },

  notes: { type: String },

  createdBy: { type: String }
}, { timestamps: true })

ExpenseSchema.index({ expenseDate: -1 })
ExpenseSchema.index({ projectId: 1, expenseDate: -1 })
ExpenseSchema.index({ category: 1, expenseDate: -1 })
ExpenseSchema.index({ paymentStatus: 1, dueDate: 1 })

export default (mongoose.models.Expense as mongoose.Model<IExpense>) ||
  mongoose.model<IExpense>('Expense', ExpenseSchema)
