import mongoose, { Schema, model, models, Document } from 'mongoose'

/**
 * État de diffusion d'une mission par le Visibility Engine + audit des vagues.
 *
 * Persiste l'avancement de l'escalade (stage courant, prochain déclenchement,
 * prestataires déjà notifiés, offres reçues) afin de :
 *  - dédupliquer les notifications entre vagues,
 *  - évaluer les conditions d'arrêt,
 *  - survivre à un redémarrage (le Recovery Scheduler s'appuie dessus),
 *  - fournir un reporting/analytics (et de futurs indicateurs de monétisation).
 */

export type VisibilityDispatchStatus = 'active' | 'stopped' | 'completed' | 'expired' | 'failed'

export interface IWaveAudit {
  stage: number
  radiusKm: number
  at: Date
  providerIds: string[]
  socketCount: number
  pushDelivered: number
  pushTokenCount: number
}

export interface IVisibilityDispatch extends Document {
  requestId: mongoose.Types.ObjectId
  clientId: string
  category: string
  location: { lat: number; lng: number }
  status: VisibilityDispatchStatus
  currentStage: number
  offersReceived: number
  providersNotified: string[]
  totalNotified: number
  waves: IWaveAudit[]
  stopReason?: string
  nextRunAt?: Date
  createdAt: Date
  updatedAt: Date
}

const WaveAuditSchema = new Schema<IWaveAudit>({
  stage: { type: Number, required: true },
  radiusKm: { type: Number, required: true },
  at: { type: Date, default: Date.now },
  providerIds: { type: [String], default: [] },
  socketCount: { type: Number, default: 0 },
  pushDelivered: { type: Number, default: 0 },
  pushTokenCount: { type: Number, default: 0 },
}, { _id: false })

const VisibilityDispatchSchema = new Schema<IVisibilityDispatch>({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, unique: true, index: true },
  clientId: { type: String, required: true },
  category: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  status: { type: String, enum: ['active', 'stopped', 'completed', 'expired', 'failed'], default: 'active', index: true },
  currentStage: { type: Number, default: -1 },
  offersReceived: { type: Number, default: 0 },
  providersNotified: { type: [String], default: [] },
  totalNotified: { type: Number, default: 0 },
  waves: { type: [WaveAuditSchema], default: [] },
  stopReason: { type: String },
  nextRunAt: { type: Date },
}, { timestamps: true })

const VisibilityDispatch = (models.VisibilityDispatch as mongoose.Model<IVisibilityDispatch>) ||
  model<IVisibilityDispatch>('VisibilityDispatch', VisibilityDispatchSchema)
export default VisibilityDispatch
