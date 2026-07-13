import mongoose, { Schema, model, models, Document } from 'mongoose'

/**
 * Tâche planifiée générique — support de persistance du Visibility Scheduler.
 *
 * Le Visibility Scheduler est un MOTEUR MÉTIER (pas un simple timer). Cette table
 * persiste l'état de chaque tâche (type, échéance, statut) pour survivre aux
 * redémarrages : au boot, le Recovery Scheduler recharge les tâches `pending`
 * échues ou à venir et les (re)planifie.
 *
 * Le champ `type` + un registre de handlers rendent le moteur extensible. Types
 * prévus (au-delà de la diffusion des missions) :
 *  - 'visibility_wave'    : vague d'escalade de diffusion
 *  - 'request_relaunch'   : relance auto d'une mission sans offre
 *  - 'client_reminder'    : rappel au client
 *  - 'offer_expiry'       : expiration d'offres
 *  - 'credit_refund'      : remboursement auto de crédits
 *  - 'followup'           : notification de suivi
 */

export type ScheduledTaskType =
  | 'visibility_wave'
  | 'request_relaunch'
  | 'client_reminder'
  | 'offer_expiry'
  | 'credit_refund'
  | 'followup'

export type ScheduledTaskStatus = 'pending' | 'running' | 'done' | 'cancelled' | 'failed'

export interface IScheduledTask extends Document {
  type: ScheduledTaskType
  requestId?: mongoose.Types.ObjectId
  stage?: number
  runAt: Date
  status: ScheduledTaskStatus
  payload: Record<string, any>
  attempts: number
  maxAttempts: number
  lockedAt?: Date
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

const ScheduledTaskSchema = new Schema<IScheduledTask>({
  type: { type: String, required: true, index: true },
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', index: true },
  stage: { type: Number },
  runAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'running', 'done', 'cancelled', 'failed'], default: 'pending', index: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lockedAt: { type: Date },
  lastError: { type: String },
}, { timestamps: true })

// Requête principale du sweep : tâches à exécuter (pending, échues).
ScheduledTaskSchema.index({ status: 1, runAt: 1 })

const ScheduledTask = (models.ScheduledTask as mongoose.Model<IScheduledTask>) ||
  model<IScheduledTask>('ScheduledTask', ScheduledTaskSchema)
export default ScheduledTask
