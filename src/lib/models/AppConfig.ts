import mongoose, { Schema, model, models, Document } from 'mongoose'

/**
 * Configuration globale de l'application, pilotable sans redéploiement.
 * Singleton: un seul document identifié par `key: 'global'`.
 *
 * Permet de basculer la monétisation (gratuit → points → commission)
 * et l'escrow (optionnel/obligatoire) depuis la DB.
 */

export type MonetizationMode = 'free' | 'points' | 'commission'

export interface IAppConfig extends Document {
  key: string
  monetization: {
    mode: MonetizationMode
    freeUntil?: Date
    pointsPerWonMission: number
    welcomePoints: number
    referralBonusPoints: number
    commissionRate: number // % prélevé quand mode === 'commission'
    fcfaPerPoint: number // taux de conversion recharge (1 point = X FCFA)
    escrowCostPoints: number // points débités au client pour utiliser l'escrow
  }
  escrow: {
    enabled: boolean
    mandatory: boolean
    disputeWindowHours: number
  }
  updatedAt: Date
  createdAt: Date
}

const AppConfigSchema = new Schema<IAppConfig>({
  key: { type: String, required: true, unique: true, default: 'global' },
  monetization: {
    mode: { type: String, enum: ['free', 'points', 'commission'], default: 'free' },
    freeUntil: { type: Date },
    pointsPerWonMission: { type: Number, default: 0, min: 0 },
    welcomePoints: { type: Number, default: 25, min: 0 },
    referralBonusPoints: { type: Number, default: 1000, min: 0 },
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    fcfaPerPoint: { type: Number, default: 100, min: 1 },
    escrowCostPoints: { type: Number, default: 25, min: 0 },
  },
  escrow: {
    enabled: { type: Boolean, default: true },
    mandatory: { type: Boolean, default: false },
    disputeWindowHours: { type: Number, default: 48, min: 1 },
  },
}, { timestamps: true })

const AppConfig = (models.AppConfig as mongoose.Model<IAppConfig>) || model<IAppConfig>('AppConfig', AppConfigSchema)
export default AppConfig
