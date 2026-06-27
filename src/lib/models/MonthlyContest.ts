import mongoose, { Schema, Document } from 'mongoose'

export interface IMonthlyContest extends Document {
  month: string
  year: number
  prize: string
  prizeGrains: number
  startAt: Date
  endAt: Date
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const MonthlyContestSchema = new Schema<IMonthlyContest>({
  month: { type: String, required: true },
  year: { type: Number, required: true },
  prize: { type: String, required: true },
  prizeGrains: { type: Number, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

MonthlyContestSchema.index({ year: 1, month: 1 }, { unique: true })

const MonthlyContest = (mongoose.models.MonthlyContest as mongoose.Model<IMonthlyContest>) ||
  mongoose.model<IMonthlyContest>('MonthlyContest', MonthlyContestSchema)

export default MonthlyContest
