import mongoose, { Schema, Document } from 'mongoose'

export interface IWheelSpin extends Document {
  userId: mongoose.Types.ObjectId
  result: string
  grainsEarned: number
  freeSpin: boolean
  createdAt: Date
}

const WheelSpinSchema = new Schema<IWheelSpin>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  result: { type: String, required: true },
  grainsEarned: { type: Number, required: true },
  freeSpin: { type: Boolean, default: false },
}, { timestamps: true })

const WheelSpin = (mongoose.models.WheelSpin as mongoose.Model<IWheelSpin>) ||
  mongoose.model<IWheelSpin>('WheelSpin', WheelSpinSchema)

export default WheelSpin
