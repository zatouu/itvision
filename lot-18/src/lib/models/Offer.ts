import mongoose, { Schema, model, models } from 'mongoose'

export type OfferStatus = 'submitted' | 'withdrawn' | 'accepted' | 'rejected' | 'expired'

const OfferSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  providerId: { type: String, required: true },
  providerName: { type: String },
  price: { type: Number, required: true, min: 0 },
  etaMinutes: { type: Number, min: 0 },
  comment: { type: String },
  validityMinutes: { type: Number, min: 1, max: 1440, default: 30 }, // durée validité offre (1min..24h)
  validUntil: { type: Date, required: true }, // calculé à la création
  // Verrou court posé pendant l'initiation d'un paiement (anti double-paiement concurrent)
  paymentLockUntil: { type: Date },
  status: { type: String, enum: ['submitted','withdrawn','accepted','rejected','expired'], default: 'submitted' },
  // Créneau proposé par le prestataire. Si la demande est programmée
  // (request.scheduledFor), une valeur différente = contre-proposition d'horaire.
  // Absent = le prestataire s'engage sur le créneau demandé (ou "dès que possible").
  proposedTime: { type: Date },
  // Contre-offre client (négociation InDriver-like)
  clientCounterPrice: { type: Number, min: 0 },
  clientCounterAt: { type: Date },
  clientCounterComment: { type: String },
  clientCounterAudioUrl: { type: String },
  clientCounterStatus: { type: String, enum: ['pending','accepted','rejected'] },
  // Matériel de l'intervention : compris dans le prix ou à fournir par le client (lien DDM+ facultatif)
  materialIncluded: { type: Boolean },
  materials: {
    type: [new Schema({
      name: { type: String, required: true },
      qty: { type: Number, default: 1, min: 1, max: 99 },
      byClient: { type: Boolean, default: true },
      product: {
        id: { type: String },
        name: { type: String },
        image: { type: String },
        priceFcfa: { type: Number },
        local: { type: Boolean },
        link: { type: String },
      },
    }, { _id: false })],
    default: undefined,
  },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })

OfferSchema.index({ requestId: 1, updatedAt: -1 })
OfferSchema.index({ providerId: 1, updatedAt: -1 })
OfferSchema.index({ requestId: 1, providerId: 1 }, { unique: true })
OfferSchema.index({ status: 1, validUntil: 1 })

const Offer = models.Offer || model('Offer', OfferSchema)
export default Offer
