import mongoose, { Schema, Document } from 'mongoose'

export interface ICorporateProfile extends Document {
  userId: mongoose.Types.ObjectId
  company?: string
  address?: string
  city?: string
  country?: string
  companyClientId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CorporateProfileSchema = new Schema<ICorporateProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
    ref: 'User'
  },
  company: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  companyClientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    sparse: true,
    index: true
  }
}, { timestamps: true })

export default (mongoose.models.CorporateProfile as mongoose.Model<ICorporateProfile>) ||
  mongoose.model<ICorporateProfile>('CorporateProfile', CorporateProfileSchema)
