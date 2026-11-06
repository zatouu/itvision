import mongoose, { Schema, Document } from 'mongoose'

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'scheduled' | 'cancelled'

export interface ICampaign extends Document {
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  sector?: string
  city?: string
  status: CampaignStatus
  leadIds?: string[]
  sentCount: number
  failedCount: number
  openedCount: number
  clickedCount: number
  sentAt?: Date
  scheduledAt?: Date
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const CampaignSchema = new Schema<ICampaign>({
  name: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  htmlContent: { type: String, required: true },
  textContent: { type: String },
  sector: { type: String },
  city: { type: String },
  status: { type: String, enum: ['draft', 'sending', 'sent', 'scheduled', 'cancelled'], default: 'draft' },
  leadIds: { type: [Schema.Types.ObjectId], default: [] },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  openedCount: { type: Number, default: 0 },
  clickedCount: { type: Number, default: 0 },
  sentAt: { type: Date },
  scheduledAt: { type: Date },
  createdBy: { type: String },
}, { timestamps: true })

CampaignSchema.index({ status: 1, createdAt: -1 })
CampaignSchema.index({ sector: 1 })

export default mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema)
