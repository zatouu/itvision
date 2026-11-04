import mongoose, { Schema, Document, Model } from 'mongoose'

/** Point de retrait DDM+ par quartier (colis importés et lots d'achats groupés). */
export interface IPickupPoint extends Document {
  name: string
  neighborhood: string
  city: string
  address: string
  landmark?: string
  phone?: string
  hours?: string
  mapsUrl?: string
  active: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const PickupPointSchema = new Schema<IPickupPoint>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    neighborhood: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, default: 'Dakar', maxlength: 80 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    landmark: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
    hours: { type: String, trim: true, maxlength: 120 },
    mapsUrl: { type: String, trim: true, maxlength: 500 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const PickupPoint: Model<IPickupPoint> =
  mongoose.models.PickupPoint || mongoose.model<IPickupPoint>('PickupPoint', PickupPointSchema)

export default PickupPoint
