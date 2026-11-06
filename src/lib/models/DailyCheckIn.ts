import mongoose, { Schema, Document } from 'mongoose'

export interface IDailyCheckIn extends Document {
  userId: mongoose.Types.ObjectId
  date: Date
  streak: number
  totalDays: number
  grainsEarned: number
  createdAt: Date
  updatedAt: Date
}

const DailyCheckInSchema = new Schema<IDailyCheckIn>({
  userId: { type: Schema.Types.ObjectId, required: true, },
  date: { type: Date, required: true, },
  streak: { type: Number, default: 1 },
  totalDays: { type: Number, default: 1 },
  grainsEarned: { type: Number, default: 0 },
}, { timestamps: true })

DailyCheckInSchema.index({ userId: 1, date: -1 }, { unique: true })

const DailyCheckIn = (mongoose.models.DailyCheckIn as mongoose.Model<IDailyCheckIn>) ||
  mongoose.model<IDailyCheckIn>('DailyCheckIn', DailyCheckInSchema)

export default DailyCheckIn
