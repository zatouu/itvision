import mongoose, { Schema } from 'mongoose'

// Compteurs atomiques de numérotation (ex. _id 'DEV-2026-' → seq 42)
export interface IDocumentCounter {
  _id: string
  seq: number
}

const DocumentCounterSchema = new Schema<IDocumentCounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
)

export default (mongoose.models.DocumentCounter as mongoose.Model<IDocumentCounter>) ||
  mongoose.model<IDocumentCounter>('DocumentCounter', DocumentCounterSchema)
