/**
 * SourcingRequest — Demande de sourcing client ("Trouvez-moi ce produit").
 *
 * Le client soumet une photo, un lien externe et/ou une description d'un produit
 * absent du catalogue. L'équipe sourcing revient avec une proposition ferme
 * (prix livré + délai) dans un SLA de 24h ouvrées.
 *
 * Le client peut être authentifié (userId présent) OU anonyme (contactPhone requis).
 * Dans tous les cas, un publicToken signé est généré pour suivre la demande via
 * un lien SMS (sans nécessiter de compte).
 */

import mongoose, { Schema, Document, Model } from 'mongoose'
import { randomBytes } from 'crypto'

export type SourcingStatus =
  | 'new'              // créée, attente sourcer
  | 'searching'        // sourcer assigné, recherche en cours
  | 'proposal_ready'   // proposition draft prête (admin) mais non envoyée
  | 'proposal_sent'    // envoyée au client, en attente de décision
  | 'accepted'         // client a accepté la proposition
  | 'rejected'         // client a refusé
  | 'fulfilled'        // produit livré (lié à une commande)
  | 'cancelled'        // client a annulé avant proposition
  | 'expired'          // proposition non décidée avant deadline

export type SourcingSource = 'photo' | 'link' | 'text'

export interface SourcingProposal {
  // Identité du produit proposé
  productName: string
  productImage?: string
  productGallery?: string[]
  supplierUrl?: string          // lien 1688/AliExpress de référence
  supplierName?: string
  notes?: string

  // Pricing transparent (mêmes briques que Product/Cart calculator)
  price1688?: number            // CNY
  exchangeRate?: number         // 1 CNY = X FCFA (typique 100)
  productCostFCFA: number       // price1688 × exchangeRate (ou baseCost direct)
  serviceFeeRate: number        // % (5/10/15)
  serviceFeeAmount: number      // FCFA
  insuranceRate: number         // % (typique 2.5)
  insuranceAmount: number       // FCFA
  shippingMethod: 'air_express' | 'air_economy' | 'sea_freight'
  shippingCost: number          // FCFA
  totalClientPrice: number      // FCFA (TTC, livré Dakar)
  currency: 'FCFA'

  // Logistique
  qty: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  deliveryDays: number          // délai estimé en jours

  // Métadonnées
  proposedBy: string            // userId admin
  proposedByName?: string
  proposedAt: Date
  expiresAt: Date               // typiquement +72h après envoi
  alternativeOffers?: Array<{
    label: string
    totalClientPrice: number
    deliveryDays: number
    notes?: string
  }>
}

export interface ISourcingRequest extends Document {
  // ── Identité client ────────────────────────────────────────────────────────
  userId?: string               // si connecté
  contactPhone: string          // toujours requis (E.164 normalisé)
  contactName?: string
  contactEmail?: string
  isAnonymous: boolean          // true si pas de userId

  // ── Demande ────────────────────────────────────────────────────────────────
  source: SourcingSource
  imageUrl?: string             // upload local /api/uploads/...
  imageHash?: string            // perceptual hash (pour dedup et match futur)
  externalUrl?: string          // lien AliExpress / Amazon / Instagram / etc.
  title?: string                // titre court ("Perceuse 18V")
  description: string           // description longue
  qty: number                   // quantité souhaitée
  budgetMaxFCFA?: number        // budget cible côté client (optionnel)
  deliveryNeededBy?: Date       // deadline livraison (optionnelle)
  categoryHint?: string         // catégorie suggérée par client

  // ── Workflow ───────────────────────────────────────────────────────────────
  status: SourcingStatus
  slaDueAt: Date                // createdAt + 24h ouvrées (SLA promis)
  assignedToUserId?: string     // sourcer humain
  assignedAt?: Date
  adminNotes?: string

  // ── Auto-match catalogue (rempli à la création) ───────────────────────────
  catalogMatches: Array<{
    productId: string
    similarity: number          // 0-100
    matchedAt: Date
  }>

  // ── Résultats recherche externe 1688 (bridge) ───────────────────────────────
  externalSearchResults?: Array<{
    title: string
    price1688?: number
    image: string
    url: string
    supplier?: string
    minOrder?: number
    location?: string
    platform: '1688'
    searchedAt: Date
  }>

  // ── Proposition finale ─────────────────────────────────────────────────────
  proposal?: SourcingProposal
  proposalSentAt?: Date
  proposalSmsMessageId?: string // id SMS pour debug

  // ── Décision client ────────────────────────────────────────────────────────
  clientDecision?: 'accepted' | 'rejected'
  clientDecisionAt?: Date
  clientDecisionNotes?: string

  // ── Suivi commande ─────────────────────────────────────────────────────────
  productId?: string            // Product créé après acceptation
  orderId?: string              // commande déclenchée

  // ── Sécurité / tracking ────────────────────────────────────────────────────
  publicToken: string           // pour lien SMS public (non devinable)
  reference: string             // SR-XXXXXX visible client

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: Date
  updatedAt: Date
}

const ProposalSchema = new Schema<SourcingProposal>(
  {
    productName: { type: String, required: true, trim: true, maxlength: 300 },
    productImage: { type: String, trim: true },
    productGallery: { type: [String], default: [] },
    supplierUrl: { type: String, trim: true },
    supplierName: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 2000 },

    price1688: { type: Number, min: 0 },
    exchangeRate: { type: Number, min: 0 },
    productCostFCFA: { type: Number, required: true, min: 0 },
    serviceFeeRate: { type: Number, required: true, min: 0, max: 100 },
    serviceFeeAmount: { type: Number, required: true, min: 0 },
    insuranceRate: { type: Number, required: true, min: 0, max: 100 },
    insuranceAmount: { type: Number, required: true, min: 0 },
    shippingMethod: {
      type: String,
      required: true,
      enum: ['air_express', 'air_economy', 'sea_freight']
    },
    shippingCost: { type: Number, required: true, min: 0 },
    totalClientPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'FCFA', enum: ['FCFA'] },

    qty: { type: Number, required: true, min: 1 },
    weightKg: { type: Number, min: 0 },
    lengthCm: { type: Number, min: 0 },
    widthCm: { type: Number, min: 0 },
    heightCm: { type: Number, min: 0 },
    deliveryDays: { type: Number, required: true, min: 1, max: 180 },

    proposedBy: { type: String, required: true },
    proposedByName: { type: String, trim: true },
    proposedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    alternativeOffers: {
      type: [
        {
          label: { type: String, required: true, trim: true, maxlength: 100 },
          totalClientPrice: { type: Number, required: true, min: 0 },
          deliveryDays: { type: Number, required: true, min: 1, max: 180 },
          notes: { type: String, trim: true, maxlength: 500 }
        }
      ],
      default: []
    }
  },
  { _id: false }
)

const CatalogMatchSchema = new Schema(
  {
    productId: { type: String, required: true },
    similarity: { type: Number, required: true, min: 0, max: 100 },
    matchedAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
)

const ExternalSearchResultSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    price1688: { type: Number, min: 0 },
    image: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    supplier: { type: String, trim: true },
    minOrder: { type: Number, min: 0 },
    location: { type: String, trim: true },
    platform: { type: String, default: '1688', enum: ['1688'] },
    searchedAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const SourcingRequestSchema = new Schema<ISourcingRequest>(
  {
    userId: { type: String, index: true, sparse: true },
    contactPhone: { type: String, required: true, index: true },
    contactName: { type: String, trim: true, maxlength: 100 },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 150 },
    isAnonymous: { type: Boolean, default: true },

    source: { type: String, required: true, enum: ['photo', 'link', 'text'] },
    imageUrl: { type: String, trim: true },
    imageHash: { type: String, index: true, sparse: true },
    externalUrl: { type: String, trim: true, maxlength: 1000 },
    title: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 4000 },
    qty: { type: Number, required: true, min: 1, max: 100000, default: 1 },
    budgetMaxFCFA: { type: Number, min: 0 },
    deliveryNeededBy: { type: Date },
    categoryHint: { type: String, trim: true, maxlength: 100 },

    status: {
      type: String,
      required: true,
      enum: [
        'new',
        'searching',
        'proposal_ready',
        'proposal_sent',
        'accepted',
        'rejected',
        'fulfilled',
        'cancelled',
        'expired'
      ],
      default: 'new',
      index: true
    },
    slaDueAt: { type: Date, required: true, index: true },
    assignedToUserId: { type: String, index: true, sparse: true },
    assignedAt: { type: Date },
    adminNotes: { type: String, trim: true, maxlength: 5000 },

    catalogMatches: { type: [CatalogMatchSchema], default: [] },
    externalSearchResults: { type: [ExternalSearchResultSchema], default: undefined },

    proposal: { type: ProposalSchema, default: undefined },
    proposalSentAt: { type: Date },
    proposalSmsMessageId: { type: String },

    clientDecision: { type: String, enum: ['accepted', 'rejected'] },
    clientDecisionAt: { type: Date },
    clientDecisionNotes: { type: String, trim: true, maxlength: 1000 },

    productId: { type: String, sparse: true },
    orderId: { type: String, sparse: true },

    publicToken: { type: String, required: true, unique: true, index: true },
    reference: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: true }
)

SourcingRequestSchema.index({ status: 1, slaDueAt: 1 })
SourcingRequestSchema.index({ createdAt: -1 })

/**
 * Calcul du SLA : +24h ouvrées (lun-sam, hors dimanche).
 * Pour simplicité, on ajoute 24h calendaires sauf si la deadline tombe un dimanche
 * → on la repousse au lundi 18h.
 */
export function computeSlaDueAt(from: Date = new Date()): Date {
  const due = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  if (due.getDay() === 0) {
    // dimanche -> lundi 18h heure serveur
    due.setDate(due.getDate() + 1)
    due.setHours(18, 0, 0, 0)
  }
  return due
}

/**
 * Génère une référence client lisible : SR-XXXXXX (6 chars base36).
 */
export function generateSourcingReference(): string {
  const rand = randomBytes(4).readUInt32BE(0).toString(36).toUpperCase().slice(0, 6).padStart(6, '0')
  return `SR-${rand}`
}

/**
 * Génère un token public non-devinable pour le lien de tracking SMS.
 */
export function generatePublicToken(): string {
  return randomBytes(24).toString('base64url')
}

const SourcingRequest: Model<ISourcingRequest> =
  mongoose.models.SourcingRequest ||
  mongoose.model<ISourcingRequest>('SourcingRequest', SourcingRequestSchema)

export default SourcingRequest
