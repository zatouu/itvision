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
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Solde en FCFA (escrow cash, payouts providers)
  balance: { type: Number, default: 0 },
  escrow: { type: Number, default: 0 },
  // Système de points (monétisation providers — style Yango/InDrive)
  points: { type: Number, default: 0, min: 0 },
  lifetimePointsEarned: { type: Number, default: 0, min: 0 },
  lifetimePointsSpent: { type: Number, default: 0, min: 0 },
  txns: { type: [WalletTxnSchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: false, updatedAt: 'updatedAt' } })

const Wallet = models.Wallet || model('Wallet', WalletSchema)
export default Wallet
