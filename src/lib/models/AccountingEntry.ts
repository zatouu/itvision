import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IAccountingEntry extends Document {
  // Identification
  entryType: 'sale' | 'purchase' | 'expense' | 'revenue' | 'margin' | 'commission'
  entryNumber: string // Numéro unique (ex: ACC-2024-001)
  
  // Références
  productId?: Types.ObjectId | string
  productName?: string
  orderId?: string
  clientId?: Types.ObjectId | string
  clientName?: string
  
  // Montants
  amount: number // Montant principal
  currency: string // Devise (FCFA, EUR, etc.)
  
  // Détails pricing 1688 (si applicable)
  pricing1688?: {
    price1688?: number // Prix en Yuan
    exchangeRate?: number
    productCostFCFA: number
    shippingCostReal: number
    shippingCostClient: number
    serviceFee: number
    insuranceFee: number
    totalRealCost: number
    totalClientPrice: number
    shippingMargin: number
    netMargin: number
    marginPercentage: number
    shippingMethod?: string
  }
  
  // Catégorisation
  category: string // 'product_sale', 'service', 'installation', etc.
  subCategory?: string
  
  // Dates
  transactionDate: Date
  recordedAt: Date
  
  // Métadonnées
  notes?: string
  metadata?: Record<string, any>
  
  // Statut
  status: 'pending' | 'confirmed' | 'cancelled'
  confirmedBy?: Types.ObjectId
  confirmedAt?: Date
}

const AccountingEntrySchema = new Schema<IAccountingEntry>({
  entryType: {
    type: String,
    enum: ['sale', 'purchase', 'expense', 'revenue', 'margin', 'commission'],
    required: true,
    index: true
  },
  entryNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  productName: String,
  orderId: String,
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  clientName: String,
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'FCFA'
  },
  pricing1688: {
    price1688: Number,
    exchangeRate: Number,
    productCostFCFA: Number,
    shippingCostReal: Number,
    shippingCostClient: Number,
    serviceFee: Number,
    insuranceFee: Number,
    totalRealCost: Number,
    totalClientPrice: Number,
    shippingMargin: Number,
    netMargin: Number,
    marginPercentage: Number,
    shippingMethod: String
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subCategory: String,
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  notes: String,
  metadata: Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed',
    index: true
  },
  confirmedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedAt: Date
}, {
  timestamps: true
})

// Index composés pour requêtes fréquentes
AccountingEntrySchema.index({ entryType: 1, transactionDate: -1 })
AccountingEntrySchema.index({ category: 1, transactionDate: -1 })
AccountingEntrySchema.index({ status: 1, transactionDate: -1 })
AccountingEntrySchema.index({ productId: 1, transactionDate: -1 })

// Génération automatique du numéro d'entrée
AccountingEntrySchema.pre('save', async function(next) {
  if (!this.entryNumber) {
    const year = new Date().getFullYear()
    const count = await mongoose.models.AccountingEntry?.countDocuments({
      entryNumber: new RegExp(`^ACC-${year}-`)
    }) || 0
    this.entryNumber = `ACC-${year}-${String(count + 1).padStart(6, '0')}`
  }
  next()
})

const AccountingEntry = mongoose.models.AccountingEntry ||
  mongoose.model<IAccountingEntry>('AccountingEntry', AccountingEntrySchema)

export default AccountingEntry

