import mongoose, { Schema, model, models, Document } from 'mongoose'

/**
 * Grand livre (ledger) des mouvements de points/cash du wallet.
 * Collection séparée du Wallet pour permettre la pagination de l'historique
 * sans faire grossir le document Wallet indéfiniment.
 */

export type WalletTransactionKind =
  | 'welcome'        // crédit de bienvenue à l'inscription
  | 'topup'          // recharge points via Mobile Money
  | 'mission_spend'  // points consommés sur une mission gagnée
  | 'referral_bonus' // bonus parrainage crédité en points
  | 'refund'         // remboursement de points (mission annulée)
  | 'admin_adjust'   // ajustement manuel admin
  | 'escrow_charge'  // points débités au client pour escrow
  | 'escrow_refund'  // points remboursés sur annulation/refund escrow

export interface IWalletTransaction extends Document {
  userId: mongoose.Types.ObjectId
  kind: WalletTransactionKind
  // Positif = crédit, négatif = débit
  points: number
  balanceAfter: number
  description?: string
  relatedMissionId?: mongoose.Types.ObjectId
  paymentRef?: string
  createdAt: Date
}

const WalletTransactionSchema = new Schema<IWalletTransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: {
    type: String,
    enum: ['welcome', 'topup', 'mission_spend', 'referral_bonus', 'refund', 'admin_adjust', 'escrow_charge', 'escrow_refund'],
    required: true,
  },
  points: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String },
  relatedMissionId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest' },
  paymentRef: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

WalletTransactionSchema.index({ userId: 1, createdAt: -1 })

const WalletTransaction = (models.WalletTransaction as mongoose.Model<IWalletTransaction>) ||
  model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema)
export default WalletTransaction
