import mongoose, { Schema, Document } from 'mongoose'

export interface IQuoteProduct {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  marginRate?: number
  totalPrice: number
}

export interface IQuote extends Document {
  clientId: mongoose.Types.ObjectId
  serviceCode: string
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  products: IQuoteProduct[]
  subtotal: number
  marginTotal: number
  totalHT: number
  totalTTC: number
  currency: string
  assignedTechnicianId?: mongoose.Types.ObjectId
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const QuoteProductSchema = new Schema<IQuoteProduct>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  marginRate: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true, min: 0 }
})

const QuoteSchema = new Schema<IQuote>({
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  serviceCode: { type: String, required: true, uppercase: true, index: true },
  status: { type: String, enum: ['draft', 'sent', 'approved', 'rejected'], default: 'draft', index: true },
  products: { type: [QuoteProductSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  marginTotal: { type: Number, default: 0 },
  totalHT: { type: Number, default: 0 },
  totalTTC: { type: Number, default: 0 },
  currency: { type: String, default: 'Fcfa' },
  assignedTechnicianId: { type: Schema.Types.ObjectId, ref: 'Technician' },
  notes: { type: String }
}, { timestamps: true })

QuoteSchema.index({ createdAt: -1 })

export default mongoose.models.Quote || mongoose.model<IQuote>('Quote', QuoteSchema)


