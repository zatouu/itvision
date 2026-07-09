import mongoose, { Schema, model, models, Document } from 'mongoose'

export type MissionUnlockStatus = 'active' | 'refunded' | 'spent' | 'expired'

export interface IMissionUnlock extends Document {
  requestId: mongoose.Types.ObjectId
  providerId: mongoose.Types.ObjectId
  points: number // crédits dépensés pour débloquer la mission
  status: MissionUnlockStatus
  offerSentAt?: Date
  refundedAt?: Date
  refundReason?: string
  spentAt?: Date // date où une offre a été acceptée / mission assignée (crédits consommés)
  createdAt: Date
}

const MissionUnlockSchema = new Schema<IMissionUnlock>({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  points: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'refunded', 'spent', 'expired'], default: 'active' },
  offerSentAt: { type: Date },
  refundedAt: { type: Date },
  refundReason: { type: String },
  spentAt: { type: Date },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

MissionUnlockSchema.index({ requestId: 1, providerId: 1 }, { unique: true })
MissionUnlockSchema.index({ providerId: 1, status: 1, createdAt: -1 })

const MissionUnlock = (models.MissionUnlock as mongoose.Model<IMissionUnlock>) || model<IMissionUnlock>('MissionUnlock', MissionUnlockSchema)
export default MissionUnlock
