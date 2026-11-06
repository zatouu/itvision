import mongoose, { Schema, Document } from 'mongoose'

export interface IReportPhoto extends Document {
  reportId: mongoose.Types.ObjectId
  filename: string
  url: string
  type: 'BEFORE' | 'AFTER' | 'DURING'
  caption?: string
  createdAt: Date
}

const ReportPhotoSchema = new Schema<IReportPhoto>({
  reportId: { type: Schema.Types.ObjectId, ref: 'MaintenanceReport', required: true, index: true },
  filename: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['BEFORE', 'AFTER', 'DURING'], required: true },
  caption: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.ReportPhoto || mongoose.model<IReportPhoto>('ReportPhoto', ReportPhotoSchema)
