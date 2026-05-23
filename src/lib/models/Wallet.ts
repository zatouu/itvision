import mongoose, { Schema, model, models } from 'mongoose'

export type WalletTxnType = 'escrow_hold' | 'escrow_release' | 'payout' | 'refund' | 'topup'

const WalletTxnSchema = new Schema({
  type: { type: String, enum: ['escrow_hold','escrow_release','payout','refund','topup'], required: true },
  amount: { type: Number, required: true },
  ref: { type: String },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { _id: false })

const WalletSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  balance: { type: Number, default: 0 },
  escrow: { type: Number, default: 0 },
  txns: { type: [WalletTxnSchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: false, updatedAt: 'updatedAt' } })

WalletSchema.index({ userId: 1 })

const Wallet = models.Wallet || model('Wallet', WalletSchema)
export default Wallet
