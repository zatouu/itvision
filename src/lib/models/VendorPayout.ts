import mongoose, { Schema, Document } from 'mongoose'

// Demande de retrait vendeur — cycle : pending → approved → paid | rejected
export interface IVendorPayout extends Document {
  vendorId: mongoose.Types.ObjectId
  shopId: mongoose.Types.ObjectId
  amount: number
  method: 'wave' | 'orange_money' | 'free_money' | 'bank_transfer'
  phone?: string
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  rejectionReason?: string
  requestedAt: Date
  processedAt?: Date
  processedBy?: string
  note?: string
  createdAt: Date
  updatedAt: Date
}

const VendorPayoutSchema = new Schema<IVendorPayout>({
  vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  amount: { type: Number, required: true, min: 1000 },
  method: { type: String, enum: ['wave', 'orange_money', 'free_money', 'bank_transfer'], required: true },
  phone: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending', index: true },
  rejectionReason: { type: String },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  processedBy: { type: String },
  note: { type: String },
}, { timestamps: true })

VendorPayoutSchema.index({ vendorId: 1, status: 1, createdAt: -1 })

export default mongoose.models.VendorPayout || mongoose.model<IVendorPayout>('VendorPayout', VendorPayoutSchema)
