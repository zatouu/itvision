import mongoose, { Schema, model, models, Document } from 'mongoose'

/**
 * Abonnement de visibilité d'un prestataire (levier de monétisation FUTUR).
 *
 * En MVP : aucun paiement. Tout prestataire sans document ici est traité par défaut
 * comme tier 'free' (rayon = defaultRadiusKm de la config). Ce modèle est prévu pour
 * accueillir plus tard : rayon étendu, boosts, crédits, badges Pro, sponsorisation…
 * sans refonte du moteur.
 */

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

export interface IProviderSubscription extends Document {
  userId: mongoose.Types.ObjectId
  tier: string // 'free' | 'plus' | 'pro' | 'unlimited' | ... (défini dans AppConfig.visibility.tiers)
  visibilityRadiusKm: number // rayon effectif ; -1 = illimité. Si null/absent → tier de la config
  priorityLevel: number
  boostMultiplier: number
  features: string[] // ex: ['priority_dispatch', 'boost', 'badge_pro'] — extensible
  status: SubscriptionStatus
  activeUntil?: Date
  createdAt: Date
  updatedAt: Date
}

const ProviderSubscriptionSchema = new Schema<IProviderSubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  tier: { type: String, default: 'free', index: true },
  visibilityRadiusKm: { type: Number, default: 10 },
  priorityLevel: { type: Number, default: 0 },
  boostMultiplier: { type: Number, default: 1 },
  features: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
  activeUntil: { type: Date },
}, { timestamps: true })

const ProviderSubscription = (models.ProviderSubscription as mongoose.Model<IProviderSubscription>) ||
  model<IProviderSubscription>('ProviderSubscription', ProviderSubscriptionSchema)
export default ProviderSubscription
