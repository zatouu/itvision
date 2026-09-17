import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Intérêt « Préviens-moi » : un utilisateur veut être notifié quand un achat
 * groupé est créé pour un produit (ou pour les achats groupés en général).
 * Sert aussi à mesurer la demande latente par produit.
 */
export interface IGroupInterest extends Document {
  productId?: mongoose.Types.ObjectId
  productName?: string
  /** Clé de déduplication : productId ou 'global' (intérêt générique). */
  scope: string
  phone: string
  name?: string
  userId?: mongoose.Types.ObjectId
  notified: boolean
  createdAt: Date
  updatedAt: Date
}

const GroupInterestSchema = new Schema<IGroupInterest>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    productName: { type: String },
    scope: { type: String, required: true, default: 'global' },
    phone: { type: String, required: true },
    name: { type: String },
    userId: { type: Schema.Types.ObjectId, sparse: true },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Un même téléphone ne peut s'inscrire qu'une fois par scope (produit ou global).
GroupInterestSchema.index({ scope: 1, phone: 1 }, { unique: true })
GroupInterestSchema.index({ productId: 1, notified: 1 })

const GroupInterest: Model<IGroupInterest> =
  mongoose.models.GroupInterest || mongoose.model<IGroupInterest>('GroupInterest', GroupInterestSchema)

export default GroupInterest
