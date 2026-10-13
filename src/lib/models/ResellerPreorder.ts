import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Précommandes ouvertes par un revendeur à ses propres clients sur un achat groupé :
 * les clients réservent (sans payer DDM+), le revendeur rejoint ou complète le groupe avec le total.
 */
export interface IPreorderReservation {
  _id?: mongoose.Types.ObjectId
  name: string
  phone: string
  qty: number
  note?: string
  status: 'reserved' | 'confirmed' | 'cancelled'
  createdAt: Date
}

export interface IResellerPreorder extends Document {
  code: string
  groupId: string
  ownerUserId: mongoose.Types.ObjectId
  ownerName: string
  ownerPhone?: string
  shopSlug?: string
  productName: string
  productImage?: string
  resalePrice: number
  deposit?: number
  message?: string
  reservations: IPreorderReservation[]
  closed: boolean
  createdAt: Date
  updatedAt: Date
}

const ReservationSchema = new Schema<IPreorderReservation>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true },
    qty: { type: Number, required: true, min: 1, max: 100 },
    note: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: ['reserved', 'confirmed', 'cancelled'], default: 'reserved' },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
)

const ResellerPreorderSchema = new Schema<IResellerPreorder>(
  {
    code: { type: String, required: true, unique: true, index: true },
    groupId: { type: String, required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    ownerName: { type: String, required: true, trim: true, maxlength: 80 },
    ownerPhone: { type: String },
    shopSlug: { type: String },
    productName: { type: String, required: true },
    productImage: { type: String },
    resalePrice: { type: Number, required: true, min: 100 },
    deposit: { type: Number, min: 0 },
    message: { type: String, trim: true, maxlength: 300 },
    reservations: { type: [ReservationSchema], default: [] },
    closed: { type: Boolean, default: false },
  },
  { timestamps: true }
)

ResellerPreorderSchema.index({ groupId: 1, ownerUserId: 1 }, { unique: true })

const ResellerPreorder: Model<IResellerPreorder> =
  mongoose.models.ResellerPreorder || mongoose.model<IResellerPreorder>('ResellerPreorder', ResellerPreorderSchema)

export default ResellerPreorder
