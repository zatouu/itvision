import mongoose, { Schema, Document } from 'mongoose'

/** Documents générés et figés à un instant donné (ex. PV de réception signé), conservés en base comme preuve. */
export interface IArchivedDocument extends Document {
  kind: 'reception_pv'
  refId: mongoose.Types.ObjectId
  filename: string
  contentType: string
  data: Buffer
  sha256: string
  size: number
  reason?: string
  createdAt: Date
}

const ArchivedDocumentSchema = new Schema<IArchivedDocument>({
  kind: { type: String, enum: ['reception_pv'], required: true },
  refId: { type: Schema.Types.ObjectId, required: true },
  filename: { type: String, required: true },
  contentType: { type: String, default: 'application/pdf' },
  data: { type: Buffer, required: true },
  sha256: { type: String, required: true },
  size: { type: Number, required: true },
  reason: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } })

ArchivedDocumentSchema.index({ kind: 1, refId: 1, createdAt: -1 })

export default mongoose.models.ArchivedDocument || mongoose.model<IArchivedDocument>('ArchivedDocument', ArchivedDocumentSchema)
