import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Commission d'un ambassadeur DDM+ (lien ?ref=CODE) sur une vente payée.
 * Cycle : pending (payée) → validated (livrée) → paid (versée) ; cancelled si annulée ou remboursée.
 */
export type AmbassadorCommissionStatus = 'pending' | 'validated' | 'paid' | 'cancelled'

export interface IAmbassadorCommission extends Document {
  ambassadorUserId: mongoose.Types.ObjectId
  code: string
  sourceType: 'order' | 'group'
  /** orderId (CMD-…) ou `${groupId}:${participantId}` */
  sourceId: string
  groupId?: string
  buyerName?: string
  label: string
  baseAmount: number
  rate: number
  amount: number
  status: AmbassadorCommissionStatus
  validatedAt?: Date
  cancelledAt?: Date
  payoutRequestedAt?: Date
  payoutMethod?: string
  payoutPhone?: string
  paidAt?: Date
  paidReference?: string
  paidBy?: string
  createdAt: Date
  updatedAt: Date
}

const AmbassadorCommissionSchema = new Schema<IAmbassadorCommission>(
  {
    ambassadorUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    sourceType: { type: String, enum: ['order', 'group'], required: true },
    sourceId: { type: String, required: true },
    groupId: { type: String, index: true, sparse: true },
    buyerName: { type: String },
    label: { type: String, required: true },
    baseAmount: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0, max: 1 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'validated', 'paid', 'cancelled'], default: 'pending', index: true },
    validatedAt: { type: Date },
    cancelledAt: { type: Date },
    payoutRequestedAt: { type: Date },
    payoutMethod: { type: String },
    payoutPhone: { type: String },
    paidAt: { type: Date },
    paidReference: { type: String },
    paidBy: { type: String },
  },
  { timestamps: true }
)

AmbassadorCommissionSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true })
AmbassadorCommissionSchema.index({ ambassadorUserId: 1, status: 1 })

const AmbassadorCommission: Model<IAmbassadorCommission> =
  mongoose.models.AmbassadorCommission ||
  mongoose.model<IAmbassadorCommission>('AmbassadorCommission', AmbassadorCommissionSchema)

export default AmbassadorCommission
