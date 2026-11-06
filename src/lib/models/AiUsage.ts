import mongoose, { Schema, model, models, Document } from 'mongoose'

/**
 * Compteur journalier d'utilisation de l'assistant IA par utilisateur.
 * Sert au quota gratuit quotidien et au suivi du coût réel (texte vs vision).
 * Un document par (userId, day) — `day` au format YYYY-MM-DD (UTC).
 */

export interface IAiUsage extends Document {
  userId: mongoose.Types.ObjectId
  day: string
  calls: number
  visionCalls: number
  pointsSpent: number
  byFeature: Record<string, number>
  updatedAt: Date
  createdAt: Date
}

const AiUsageSchema = new Schema<IAiUsage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  calls: { type: Number, default: 0, min: 0 },
  visionCalls: { type: Number, default: 0, min: 0 },
  pointsSpent: { type: Number, default: 0, min: 0 },
  byFeature: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

AiUsageSchema.index({ userId: 1, day: 1 }, { unique: true })
AiUsageSchema.index({ day: 1 })

const AiUsage = (models.AiUsage as mongoose.Model<IAiUsage>) || model<IAiUsage>('AiUsage', AiUsageSchema)
export default AiUsage
