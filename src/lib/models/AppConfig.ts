import mongoose, { Schema, model, models, Document } from 'mongoose'

/**
 * Configuration globale de l'application, pilotable sans redéploiement.
 * Singleton: un seul document identifié par `key: 'global'`.
 *
 * Permet de basculer la monétisation (gratuit → points → commission)
 * et l'escrow (optionnel/obligatoire) depuis la DB.
 */

export type MonetizationMode = 'free' | 'points' | 'commission'

export interface ICreditPack {
  id: string
  credits: number
  bonusCredits: number
  priceFcfa: number
  popular?: boolean
}

/** Un palier d'escalade de la diffusion d'une mission (Visibility Scheduler). */
export interface IEscalationStage {
  stage: number
  radiusKm: number
  delaySec: number // délai APRÈS la vague précédente avant de déclencher cette vague
  minOffersToStop: number // stopper l'escalade si offres reçues >= cette valeur
  minProvidersToStop: number // stopper si au moins ce nombre de providers déjà notifiés
}

/** Un tier d'abonnement de visibilité (monétisation future — non facturé en MVP). */
export interface IVisibilityTier {
  id: string
  label: string
  radiusKm: number // rayon de visibilité de base ; -1 = illimité
  priorityLevel: number // plus élevé = notifié en priorité
  boostMultiplier: number // multiplicateur appliqué au Visibility Score
}

export interface IVisibilityConfig {
  enabled: boolean // interrupteur maître ; si false, fallback legacy
  requireKycForNotification: boolean // si false, les prestataires sans KYC reçoivent quand même les notifs (mais classés plus bas)
  defaultRadiusKm: number
  maxRadiusKm: number // borne haute d'escalade (région) — jamais tout le pays
  presenceFreshnessSec: number // GPS considéré "récent" en deçà de N secondes
  maxProvidersPerWave: number // plafond de providers notifiés par vague
  escalation: IEscalationStage[]
  scoreWeights: {
    distance: number
    availability: number
    category: number
    rating: number
    responsiveness: number
  }
  tiers: IVisibilityTier[]
  fallback: {
    useLastKnownPosition: boolean
    useProfileCity: boolean
  }
}

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
  credits: {
    // Active le modèle "déblocage de mission par crédits" côté provider.
    unlockEnabled: boolean
    // Coût minimum / maximum d'un déblocage (bornes de sécurité du scoring)
    minUnlockCost: number
    maxUnlockCost: number
    // Paliers de budget (FCFA) → coût de base en crédits
    budgetTiers: { maxBudget: number; cost: number }[]
    // Multiplicateur catégories premium (slug → crédits additionnels)
    premiumCategories: Record<string, number>
    // Crédits additionnels si la demande est urgente
    urgencySurcharge: number
    // Remboursement auto si le client annule dans cette fenêtre (minutes)
    refundWindowMinutes: number
    // Packs de crédits achetables
    packs: ICreditPack[]
  }
  visibility: IVisibilityConfig
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
  credits: {
    unlockEnabled: { type: Boolean, default: false },
    minUnlockCost: { type: Number, default: 1, min: 0 },
    maxUnlockCost: { type: Number, default: 8, min: 1 },
    budgetTiers: {
      type: [{ maxBudget: { type: Number, required: true }, cost: { type: Number, required: true }, _id: false }],
      default: [
        { maxBudget: 10_000, cost: 1 },
        { maxBudget: 30_000, cost: 2 },
        { maxBudget: 75_000, cost: 3 },
        { maxBudget: 200_000, cost: 5 },
        { maxBudget: 1_000_000_000, cost: 6 },
      ],
    },
    premiumCategories: { type: Schema.Types.Mixed, default: {} },
    urgencySurcharge: { type: Number, default: 1, min: 0 },
    refundWindowMinutes: { type: Number, default: 10, min: 0 },
    packs: {
      type: [{
        id: { type: String, required: true },
        credits: { type: Number, required: true, min: 1 },
        bonusCredits: { type: Number, default: 0, min: 0 },
        priceFcfa: { type: Number, required: true, min: 100 },
        popular: { type: Boolean, default: false },
        _id: false,
      }],
      default: [
        { id: 'starter', credits: 10, bonusCredits: 0, priceFcfa: 2_000, popular: false },
        { id: 'standard', credits: 25, bonusCredits: 2, priceFcfa: 4_500, popular: false },
        { id: 'popular', credits: 60, bonusCredits: 8, priceFcfa: 10_000, popular: true },
        { id: 'pro', credits: 150, bonusCredits: 30, priceFcfa: 22_500, popular: false },
      ],
    },
  },
  visibility: {
    enabled: { type: Boolean, default: true },
    requireKycForNotification: { type: Boolean, default: false },
    defaultRadiusKm: { type: Number, default: 10, min: 1 },
    maxRadiusKm: { type: Number, default: 200, min: 1 },
    presenceFreshnessSec: { type: Number, default: 600, min: 30 },
    maxProvidersPerWave: { type: Number, default: 50, min: 1 },
    escalation: {
      type: [{
        stage: { type: Number, required: true },
        radiusKm: { type: Number, required: true },
        delaySec: { type: Number, required: true },
        minOffersToStop: { type: Number, default: 1 },
        minProvidersToStop: { type: Number, default: 5 },
        _id: false,
      }],
      default: [
        { stage: 0, radiusKm: 10, delaySec: 0, minOffersToStop: 1, minProvidersToStop: 5 },
        { stage: 1, radiusKm: 20, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 8 },
        { stage: 2, radiusKm: 30, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 12 },
        { stage: 3, radiusKm: 60, delaySec: 180, minOffersToStop: 1, minProvidersToStop: 20 },
        { stage: 4, radiusKm: 150, delaySec: 300, minOffersToStop: 1, minProvidersToStop: 40 },
      ],
    },
    scoreWeights: {
      distance: { type: Number, default: 0.4, min: 0 },
      availability: { type: Number, default: 0.2, min: 0 },
      category: { type: Number, default: 0.2, min: 0 },
      rating: { type: Number, default: 0.1, min: 0 },
      responsiveness: { type: Number, default: 0.1, min: 0 },
    },
    tiers: {
      type: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        radiusKm: { type: Number, required: true },
        priorityLevel: { type: Number, default: 0 },
        boostMultiplier: { type: Number, default: 1 },
        _id: false,
      }],
      default: [
        { id: 'free', label: 'Gratuit', radiusKm: 10, priorityLevel: 0, boostMultiplier: 1 },
        { id: 'plus', label: 'Plus', radiusKm: 20, priorityLevel: 1, boostMultiplier: 1.2 },
        { id: 'pro', label: 'Pro', radiusKm: 30, priorityLevel: 2, boostMultiplier: 1.5 },
        { id: 'unlimited', label: 'Illimité', radiusKm: -1, priorityLevel: 3, boostMultiplier: 2 },
      ],
    },
    fallback: {
      useLastKnownPosition: { type: Boolean, default: true },
      useProfileCity: { type: Boolean, default: true },
    },
  },
}, { timestamps: true })

const AppConfig = (models.AppConfig as mongoose.Model<IAppConfig>) || model<IAppConfig>('AppConfig', AppConfigSchema)
export default AppConfig
