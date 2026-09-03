import mongoose, { Schema, Document } from 'mongoose'

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'not_interested' | 'converted' | 'bounced'
export type LeadSector =
  | 'immobilier'
  | 'banque_finance'
  | 'commerce_detail'
  | 'hotellerie'
  | 'sante'
  | 'education'
  | 'industrie'
  | 'logistique'
  | 'administration'
  | 'btp'
  | 'restauration'
  | 'autre'

export interface ILead extends Document {
  companyName: string
  contactName?: string
  email: string
  phone?: string
  website?: string
  sector: LeadSector
  city?: string
  address?: string
  status: LeadStatus
  source?: string
  notes?: string
  tags?: string[]
  lastContactedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LeadSchema = new Schema<ILead>({
  companyName: { type: String, required: true, trim: true },
  contactName: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  website: { type: String, trim: true },
  sector: { type: String, enum: [
    'immobilier', 'banque_finance', 'commerce_detail', 'hotellerie',
    'sante', 'education', 'industrie', 'logistique', 'administration',
    'btp', 'restauration', 'autre'
  ], default: 'autre' },
  city: { type: String, trim: true },
  address: { type: String, trim: true },
  status: { type: String, enum: ['new', 'contacted', 'interested', 'not_interested', 'converted', 'bounced'], default: 'new' },
  source: { type: String, trim: true },
  notes: { type: String },
  tags: { type: [String], default: [] },
  lastContactedAt: { type: Date },
}, { timestamps: true })

LeadSchema.index({ email: 1 }, { unique: true })
LeadSchema.index({ sector: 1, status: 1 })
LeadSchema.index({ companyName: 'text', contactName: 'text' })

export default mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema)
