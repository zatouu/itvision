import mongoose, { Schema, Document } from 'mongoose'

export interface IExternalSearchLog extends Document {
  imageUrl: string
  description?: string
  platform: '1688' | 'aliexpress'
  status: 'success' | 'blocked' | 'no_results' | 'error'
  resultsCount: number
  results?: Array<{
    title: string
    price1688?: number
    image: string
    url: string
    supplier?: string
    minOrder?: number
  }>
  errorMessage?: string
  durationMs?: number
  ip?: string
  createdAt: Date
}

const ExternalSearchLogSchema = new Schema<IExternalSearchLog>(
  {
    imageUrl: { type: String, required: true },
    description: { type: String },
    platform: { type: String, enum: ['1688', 'aliexpress'], default: '1688' },
    status: { type: String, enum: ['success', 'blocked', 'no_results', 'error'], required: true },
    resultsCount: { type: Number, default: 0 },
    results: [
      {
        title: String,
        price1688: Number,
        image: String,
        url: String,
        supplier: String,
        minOrder: Number,
      },
    ],
    errorMessage: { type: String },
    durationMs: { type: Number },
    ip: { type: String },
  },
  { timestamps: true }
)

export const ExternalSearchLog =
  mongoose.models.ExternalSearchLog ||
  mongoose.model<IExternalSearchLog>('ExternalSearchLog', ExternalSearchLogSchema)
