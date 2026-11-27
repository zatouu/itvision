/**
 * GroupShareEvent - Funnel viral des achats groupes
 *
 * Chaque événement mesure un passage dans la boucle de partage :
 * - view     : une personne arrive sur la page du groupe via un lien partagé (?via=tiktok…)
 * - reshare  : un visiteur re-partage (clic sur un bouton de partage)
 * - join     : inscrit dans la collection GroupOrder (participant.via) — ce modèle ne
 *              couvre que les événements anonymes amont du funnel
 *
 * Pas de données personnelles : ni IP ni téléphone, juste le canal et le groupe.
 */

import mongoose, { Schema } from 'mongoose'

export interface IGroupShareEvent {
  groupId: string
  event: 'view' | 'reshare'
  via: string // canal normalisé, « direct » si absent
  createdAt: Date
}

const GroupShareEventSchema = new Schema<IGroupShareEvent>({
  groupId: { type: String, required: true, index: true },
  event: { type: String, enum: ['view', 'reshare'], required: true },
  via: { type: String, default: 'direct', maxlength: 40 },
  createdAt: { type: Date, default: Date.now },
})

// Entonnoir par groupe+canal
GroupShareEventSchema.index({ groupId: 1, event: 1, via: 1, createdAt: -1 })
// Rétention 180 jours : au-delà, l'historique n'a plus de valeur d'analyse de campagne
GroupShareEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 })

export const GroupShareEvent =
  mongoose.models.GroupShareEvent ||
  mongoose.model<IGroupShareEvent>('GroupShareEvent', GroupShareEventSchema)
