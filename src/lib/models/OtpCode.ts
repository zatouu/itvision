import mongoose, { Schema, Document } from 'mongoose'

export interface IOtpCode extends Document {
  phone: string
  code: string
  role: 'CLIENT' | 'PROVIDER'
  expiresAt: Date
  attempts: number
  verified: boolean
  createdAt: Date
}

const OtpCodeSchema = new Schema<IOtpCode>(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    role: { type: String, enum: ['CLIENT', 'PROVIDER'], required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.models.OtpCode || mongoose.model<IOtpCode>('OtpCode', OtpCodeSchema)
