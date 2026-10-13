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

  // Retenue BRS (Sénégal) — main d'oeuvre / services
  brsApplicable: boolean
  brsRate: number
  brsThreshold: number
  brsAmount: number
  netPayable: number

  // Paiement
  paymentStatus: ExpensePaymentStatus
  paymentMethod?: string // 'virement', 'especes', 'cheque', 'mobile_money', 'carte', 'autre'
  paidAmount: number
  paidAt?: Date
  // Historique des décaissements (la trésorerie compte chaque paiement à sa date)
  payments?: Array<{ amount: number; date: Date; method?: string; note?: string; recordedBy?: string }>
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

  },
  subCategory: { type: String },

  projectId: { type: Schema.Types.ObjectId, ref: 'Project', },
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

  brsApplicable: { type: Boolean, default: false },
  brsRate: { type: Number, default: 5 },
  brsThreshold: { type: Number, default: 25000 },
  brsAmount: { type: Number, default: 0 },
  netPayable: { type: Number, default: 0 },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'cancelled'],
    default: 'unpaid',

  },
  paymentMethod: { type: String },
  paidAmount: { type: Number, default: 0 },
  paidAt: { type: Date },
  // Montant négatif = correction d'un paiement saisi en trop
  payments: [{
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    method: { type: String },
    note: { type: String },
    recordedBy: { type: String },
  }],
  dueDate: { type: Date },

  isBillable: { type: Boolean, default: false, index: true },
  billedToInvoiceId: { type: Schema.Types.ObjectId, ref: 'AdminInvoice' },

  expenseDate: { type: Date, required: true, },

  attachments: { type: [ExpenseAttachmentSchema], default: [] },

  notes: { type: String },

  createdBy: { type: String }
}, { timestamps: true })

ExpenseSchema.index({ expenseDate: -1 })
ExpenseSchema.index({ projectId: 1, expenseDate: -1 })
ExpenseSchema.index({ category: 1, expenseDate: -1 })
ExpenseSchema.index({ paymentStatus: 1, dueDate: 1 })
ExpenseSchema.index({ 'payments.date': 1 })

ExpenseSchema.pre('save', async function (next) {
  const doc = this as unknown as IExpense & { isNew: boolean }

  // Numéro attribué par compteur atomique (import différé : billing importe les modèles)
  if (!doc.numero) {
    const { nextExpenseNumero } = await import('@/lib/finance/billing')
    doc.numero = await nextExpenseNumero()
  }

  // BRS et TVA s'excluent : un prestataire soumis à la retenue ne facture pas de TVA
  if (doc.brsApplicable) doc.taxRate = 0
  const ht = Number(doc.amountHT || 0)
  const rate = Number(doc.taxRate || 0)
  doc.taxAmount = Math.round(ht * rate) / 100
  doc.amountTTC = ht + doc.taxAmount

  // Retenue BRS (main d'oeuvre / services au Sénégal)
  if (doc.brsApplicable && ht > Number(doc.brsThreshold || 25000)) {
    doc.brsAmount = Math.round(ht * Number(doc.brsRate || 5)) / 100
  } else {
    doc.brsAmount = 0
  }
  doc.netPayable = doc.amountTTC - doc.brsAmount

  next()
})

export default (mongoose.models.Expense as mongoose.Model<IExpense>) ||
  mongoose.model<IExpense>('Expense', ExpenseSchema)
