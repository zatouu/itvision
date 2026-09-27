import mongoose, { Schema, Document } from 'mongoose'
import type { ServiceFeeRate } from '../types/product.types'

// Interface pour une variante de produit (avec image et prix 1688)
export interface IProductVariant {
  id?: string          // ID unique de la variante
  name: string         // Nom de la variante (ex: "Rouge", "32GB")
  sku?: string         // SKU de la variante
  image?: string       // Image spécifique de la variante
  price1688?: number   // Prix 1688 spécifique (optionnel, prix global par défaut)
  priceFCFA?: number   // Prix FCFA spécifique (optionnel)
  stock?: number       // Stock spécifique
  isDefault?: boolean // Variante par défaut
}

// Interface pour un groupe de variantes
export interface IProductVariantGroup {
  name: string              // Nom du groupe (ex: "Couleur", "Taille")
  variants: IProductVariant[]
}

// Interface pour les paliers de prix dégressifs (achat groupé)
export interface IPriceTier {
  minQty: number      // Quantité minimum pour ce palier
  maxQty?: number     // Quantité maximum (optionnel, null = illimité)
  price: number       // Prix unitaire pour ce palier
  discount?: number   // Réduction en % par rapport au prix de base
}

export interface IProduct extends Document {
  name: string
  slug?: string
  shopId?: string
  category?: string
  description?: string
  tagline?: string
  condition?: 'new' | 'used' | 'refurbished'
  tags?: string[]
  price?: number
  b2bPrice?: number                    // Prix entreprise en FCFA (séparé du prix marketplace)
  baseCost?: number                    // Coût fournisseur en FCFA
  marginRate?: number                  // Marge commerciale (0% par défaut, ajustable manuellement)
  currency?: string
  image?: string
  gallery?: string[]
  descriptionImages?: string[]          // Images de présentation/description (grandes, séparées de la galerie)
  features?: string[]
  requiresQuote?: boolean
  deliveryDays?: number
  stockStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  stockQuantity?: number
  leadTimeDays?: number
  weightKg?: number
  netWeightKg?: number
  grossWeightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  packagingWeightKg?: number
  colorOptions?: string[]
  variantOptions?: string[]
  // Variantes avec prix et images (style 1688)
  variantGroups?: IProductVariantGroup[]
  availabilityNote?: string
  isPublished?: boolean
  isFeatured?: boolean
  // Canaux de distribution
  channels?: ('marketplace' | 'corporate' | 'xeuy-bi')[]
  corporateVisible?: boolean
  // Configuration achat groupé
  groupBuyEnabled?: boolean           // Active l'achat groupé pour ce produit
  groupBuyMinQty?: number             // Quantité min totale pour lancer la commande
  groupBuyTargetQty?: number          // Quantité cible idéale
  minOrderQty?: number                // Lot minimum par commande standard (MOQ, défaut 1)
  priceTiers?: IPriceTier[]           // Paliers de prix dégressifs
  // Espace vendeur / storefront public
  sellerName?: string
  sellerSlug?: string
  sellerVerified?: boolean
  sellerRating?: number
  sourcing?: {
    platform?: string
    supplierName?: string
    supplierContact?: string
    productUrl?: string
    notes?: string
  }
  // Informations 1688
  price1688?: number // Prix en Yuan (¥)
  price1688Currency?: string // Devise 1688 (par défaut 'CNY')
  exchangeRate?: number // Taux de change (par défaut 1 ¥ = 100 FCFA)
  serviceFeeRate?: ServiceFeeRate // Frais de service (5%, 10%, 15%)
  insuranceRate?: number // Frais d'assurance (en %)
  shippingOverrides?: Array<{
    methodId: string
    ratePerKg?: number
    ratePerM3?: number
    flatFee?: number
  }>
  // TensorFlow.js Image Search
  imageEmbedding?: number[]      // Vecteur de features MobileNet (1280 dimensions)
  embeddingUpdatedAt?: Date      // Date de dernière mise à jour de l'embedding
  imageEmbeddingStatus?: 'pending' | 'ready' | 'failed'
  imageEmbeddingError?: string
  imageEmbeddingAttempts?: number
  imageEmbeddingVersion?: number
  // Historique des prix fournisseur (surveillance automatique)
  priceHistory?: Array<{
    date: Date
    price1688: number
    exchangeRate: number
    changePercent: number
    source: string // 'auto_check', 'manual_update', 'import'
  }>
  // Dernière vérification automatique du prix
  lastPriceCheckAt?: Date
  // Alerte prix configurée
  priceAlertThreshold?: number // % de changement pour alerte (ex: 10 pour 10%)
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true, index: true },
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', index: true },
  category: { type: String, index: true },
  description: { type: String },
  tagline: { type: String },
  condition: { type: String, enum: ['new', 'used', 'refurbished'], default: 'new', index: true },
  tags: { type: [String], default: [], index: true },
  price: { type: Number },
  b2bPrice: { type: Number },  // Prix entreprise (défini depuis les devis)
  baseCost: { type: Number },
  marginRate: { type: Number, default: 0 },  // Marge commerciale par défaut à 0%
  currency: { type: String, default: 'FCFA', enum: ['FCFA', 'EUR', 'USD', 'CNY'] },
  image: { type: String },
  gallery: { type: [String], default: [] },
  descriptionImages: { type: [String], default: [] },
  features: { type: [String], default: [] },
  requiresQuote: { type: Boolean, default: false },
  deliveryDays: { type: Number, default: 0 },
  stockStatus: { type: String, enum: ['in_stock', 'preorder', 'out_of_stock'], default: 'preorder' },
  stockQuantity: { type: Number, default: 0 },
  leadTimeDays: { type: Number, default: 15 },
  weightKg: { type: Number },
  netWeightKg: { type: Number },
  grossWeightKg: { type: Number },
  lengthCm: { type: Number },
  widthCm: { type: Number },
  heightCm: { type: Number },
  volumeM3: { type: Number },
  packagingWeightKg: { type: Number },
  colorOptions: { type: [String], default: [] },
  variantOptions: { type: [String], default: [] },
  // Variantes avec prix et images (style 1688)
  variantGroups: {
    type: [new Schema({
      name: { type: String, required: true },
      variants: {
        type: [new Schema({
          id: { type: String },
          name: { type: String, required: true },
          sku: { type: String },
          image: { type: String },
          price1688: { type: Number },
          stock: { type: Number }
        }, { _id: false })]
      }
    }, { _id: false })],
    default: []
  },
  availabilityNote: { type: String },
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  // Canaux de distribution
  channels: {
    type: [String],
    default: ['marketplace'],
    index: true
  },
  corporateVisible: {
    type: Boolean,
    default: false,
    index: true
  },
  // Configuration achat groupé
  groupBuyEnabled: { type: Boolean, default: false },
  groupBuyMinQty: { type: Number, default: 10 },
  groupBuyTargetQty: { type: Number, default: 50 },
  // Lot minimum par commande standard (MOQ) — appliqué au panier/checkout
  minOrderQty: { type: Number, default: 1, min: 1 },
  // Espace vendeur / storefront public
  sellerName: { type: String, index: true, sparse: true },
  sellerSlug: { type: String, index: true, sparse: true },
  sellerVerified: { type: Boolean, default: false },
  sellerRating: { type: Number, min: 0, max: 5 },
  priceTiers: {
    type: [new Schema({
      minQty: { type: Number, required: true },
      maxQty: { type: Number },
      price: { type: Number, required: true },
      discount: { type: Number }
    }, { _id: false })],
    default: []
  },
  sourcing: {
    platform: { type: String },
    supplierName: { type: String },
    supplierContact: { type: String },
    productUrl: { type: String },
    notes: { type: String }
  },
  // Informations 1688
  price1688: { type: Number },
  price1688Currency: { type: String, default: 'CNY' },
  exchangeRate: { type: Number, default: 100 }, // 1 ¥ = 100 FCFA
  serviceFeeRate: { type: Number }, // 5, 10, ou 15
  insuranceRate: { type: Number }, // Pourcentage d'assurance
  shippingOverrides: {
    type: [new Schema({
      methodId: { type: String, required: true },
      ratePerKg: { type: Number },
      ratePerM3: { type: Number },
      flatFee: { type: Number }
    }, { _id: false })],
    default: []
  },
  // TensorFlow.js Image Search
  imageEmbedding: {
    type: [Number],
    default: undefined,
    index: false,
  },
  embeddingUpdatedAt: { type: Date },
  imageEmbeddingStatus: { type: String, enum: ['pending', 'ready', 'failed'], default: 'pending', index: true },
  imageEmbeddingError: { type: String },
  imageEmbeddingAttempts: { type: Number, default: 0 },
  imageEmbeddingVersion: { type: Number },
  // Historique des prix fournisseur
  priceHistory: {
    type: [new Schema({
      date: { type: Date, required: true, default: Date.now },
      price1688: { type: Number, required: true },
      exchangeRate: { type: Number, required: true, default: 100 },
      changePercent: { type: Number, default: 0 },
      source: { type: String, enum: ['auto_check', 'manual_update', 'import'], default: 'manual_update' }
    }, { _id: false })],
    default: []
  },
  lastPriceCheckAt: { type: Date },
  priceAlertThreshold: { type: Number, default: 10 } // 10% par défaut
}, { timestamps: true })

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Normalisation logistique (fusion de l'ancien schéma Product.validated) :
 * synchronise poids net/brut, dérive le poids d'emballage et le volume m³.
 * Comble seulement les champs vides (les rejets sont dans validateLogistics).
 */
function normalizeLogistics(doc: IProduct) {
  if (doc.grossWeightKg && !doc.weightKg) doc.weightKg = doc.grossWeightKg
  else if (doc.weightKg && !doc.grossWeightKg) doc.grossWeightKg = doc.weightKg

  if (doc.netWeightKg && doc.grossWeightKg && !doc.packagingWeightKg) {
    const packaging = doc.grossWeightKg - doc.netWeightKg
    if (packaging >= 0) doc.packagingWeightKg = Math.round(packaging * 1000) / 1000
  }

  if (doc.lengthCm && doc.widthCm && doc.heightCm) {
    const volumeM3 = (doc.lengthCm * doc.widthCm * doc.heightCm) / 1_000_000
    if (!doc.volumeM3 || Math.abs(doc.volumeM3 - volumeM3) > 0.001) {
      doc.volumeM3 = Math.round(volumeM3 * 1000) / 1000
    }
  }
}

const IMPORT_PLATFORMS = ['1688', 'alibaba', 'taobao', 'xianyu', 'idlefish']
const LOGISTICS_PATHS = [
  'price1688', 'sourcing.platform', 'requiresQuote',
  'weightKg', 'grossWeightKg', 'netWeightKg', 'volumeM3', 'lengthCm', 'widthCm', 'heightCm',
]

/**
 * Contrôles logistiques (repris de l'ancien schéma Product.validated).
 * Appliqués à la création ou quand un champ logistique change : une simple
 * mise à jour de stock sur un produit legacy incomplet n'est jamais bloquée.
 */
function validateLogistics(doc: any): string | null {
  const touched = doc.isNew || LOGISTICS_PATHS.some(p => doc.isModified(p))
  if (!touched) return null

  const { lengthCm, widthCm, heightCm } = doc
  const anyDim = [lengthCm, widthCm, heightCm].some(v => v !== undefined && v !== null)
  if (anyDim) {
    if (!lengthCm || !widthCm || !heightCm) {
      return 'Toutes les dimensions (longueur, largeur, hauteur) doivent être renseignées ensemble'
    }
    if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) return 'Les dimensions doivent être positives'
  }

  // Produit d'import Chine (hors « sur devis ») : poids + volume indispensables
  // au calcul du transport, sinon le prix affiché est faux.
  const platform = doc.sourcing?.platform
  const isImported = !!(doc.price1688 || (platform && IMPORT_PLATFORMS.includes(platform)))
  if (isImported && !doc.requiresQuote) {
    if (!(doc.weightKg || doc.grossWeightKg || doc.netWeightKg)) {
      return "Les produits d'import doivent avoir un poids (kg) renseigné pour le calcul du transport"
    }
    if (!(doc.volumeM3 || (lengthCm && widthCm && heightCm))) {
      return "Les produits d'import doivent avoir un volume (m³) ou des dimensions (L, l, H) renseignés pour le calcul du transport"
    }
  }
  return null
}

// Génère un slug SEO-friendly si le nom est modifié ou si le slug est absent
ProductSchema.pre('save', async function (next) {
  const logisticsError = validateLogistics(this)
  if (logisticsError) return next(new Error(logisticsError))

  if (this.isModified('name') || !this.slug) {
    const base = slugify(this.name)
    let slug = base
    let counter = 1
    while (await mongoose.models.Product.findOne({ slug, _id: { $ne: this._id } }).lean()) {
      slug = `${base}-${counter++}`
    }
    this.slug = slug
  }
  // Normalise le slug vendeur si besoin
  if (this.sellerName && (this.isModified('sellerName') || !this.sellerSlug)) {
    this.sellerSlug = slugify(this.sellerName)
  }
  if (!this.sellerName && this.sourcing?.supplierName && !this.sellerSlug) {
    this.sellerName = this.sourcing.supplierName
    this.sellerSlug = slugify(this.sourcing.supplierName)
  }
  if (this.isModified('image')) {
    this.imageEmbedding = undefined
    this.embeddingUpdatedAt = undefined
    this.imageEmbeddingStatus = 'pending'
    this.imageEmbeddingError = undefined
    this.imageEmbeddingAttempts = 0
    this.imageEmbeddingVersion = undefined
  }
  normalizeLogistics(this)
  next()
})

// Index pour performances (fusion de l'ancien schéma Product.validated)
ProductSchema.index({ name: 'text', description: 'text', tagline: 'text', tags: 'text', 'sourcing.title': 'text' })
ProductSchema.index({ category: 1, isPublished: 1 })
ProductSchema.index({ sellerSlug: 1, isPublished: 1 })
ProductSchema.index({ shopId: 1, isPublished: 1 })
ProductSchema.index({ isFeatured: 1, createdAt: -1 })
ProductSchema.index({ groupBuyEnabled: 1, isPublished: 1 })
ProductSchema.index({ channels: 1, isPublished: 1 })
ProductSchema.index({ corporateVisible: 1, isPublished: 1 })
ProductSchema.index({ price1688: 1 })
ProductSchema.index({ stockStatus: 1, stockQuantity: 1 })

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)


