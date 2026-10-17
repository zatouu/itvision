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

  },
  subCategory: String,
  transactionDate: {
    type: Date,
    required: true,

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

// Génération automatique du numéro d'entrée.
// pre('validate') et non pre('save') : `entryNumber` est `required`, or la
// validation s'exécute AVANT les hooks de save — en pre('save') le champ était
// donc rejeté avant d'être généré (toutes les écritures vente/marge échouaient).
//
// Séquence atomique (`counters`, clé `accounting-entry-<année>`) : l'ancien
// `countDocuments + 1` attribuait le même numéro à deux écritures concurrentes
// (E11000 sur l'index unique). À la première utilisation de l'année, la
// séquence est amorcée au plus grand numéro existant (idempotent via $max).
async function nextEntrySequence(year: number): Promise<number> {
  const counters = mongoose.connection.collection<{ _id: string; seq: number }>('counters')
  const key = `accounting-entry-${year}`

  const existing = await counters.findOne({ _id: key })
  if (!existing) {
    const last = await mongoose.models.AccountingEntry
      ?.findOne({ entryNumber: new RegExp(`^ACC-${year}-\\d{6}$`) })
      .sort({ entryNumber: -1 })
      .select('entryNumber')
      .lean() as { entryNumber?: string } | null
    const lastSeq = last?.entryNumber ? parseInt(last.entryNumber.slice(-6), 10) || 0 : 0
    await counters.updateOne({ _id: key }, { $max: { seq: lastSeq } }, { upsert: true })
  }

  const res = await counters.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  )
  return res?.seq ?? 1
}

AccountingEntrySchema.pre('validate', async function(next) {
  try {
    if (!this.entryNumber) {
      const year = new Date().getFullYear()
      const seq = await nextEntrySequence(year)
      this.entryNumber = `ACC-${year}-${String(seq).padStart(6, '0')}`
    }
    next()
  } catch (err) {
    next(err as Error)
  }
})

const AccountingEntry = mongoose.models.AccountingEntry ||
  mongoose.model<IAccountingEntry>('AccountingEntry', AccountingEntrySchema)

export default AccountingEntry

