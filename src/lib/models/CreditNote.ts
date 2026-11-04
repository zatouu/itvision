import mongoose, { Schema, Document } from 'mongoose'

/** Avoir : annule tout ou partie d'une facture émise (une facture émise ne se modifie ni ne se supprime). */
export interface ICreditNote extends Document {
  numero: string
  invoiceId: mongoose.Types.ObjectId
  invoiceNumero: string
  date: Date
  reason: string
  items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>
  subtotal: number
  brsAmount: number
  taxAmount: number
  total: number
  client: { name: string; company?: string; email?: string; phone?: string; address?: string; taxId?: string }
  clientUserId?: mongoose.Types.ObjectId
  clientCompanyId?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  // Trop-perçu à rendre au client si la facture était déjà (partiellement) réglée
  refundAmount: number
  refundStatus: 'none' | 'pending' | 'refunded'
  refundedAt?: Date
  refundMethod?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const CreditNoteSchema = new Schema<ICreditNote>({
  numero: { type: String, required: true, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'AdminInvoice', required: true, index: true },
  invoiceNumero: { type: String, required: true },
  date: { type: Date, required: true, index: true },
  reason: { type: String, required: true },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  }],
  subtotal: { type: Number, default: 0 },
  brsAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true, min: 1 },
  client: {
    name: { type: String, required: true },
    company: String,
    email: String,
    phone: String,
    address: String,
    taxId: String,
  },
  clientUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  clientCompanyId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  refundAmount: { type: Number, default: 0, min: 0 },
  refundStatus: { type: String, enum: ['none', 'pending', 'refunded'], default: 'none', index: true },
  refundedAt: { type: Date },
  refundMethod: { type: String },
  createdBy: { type: String },
}, { timestamps: true })

export default mongoose.models.CreditNote || mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema)
