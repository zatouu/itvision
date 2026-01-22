import mongoose, { Schema, Document } from 'mongoose'

// Interface pour une variante de produit (avec image et prix 1688)
export interface IProductVariant {
  id?: string          // ID unique de la variante
  name: string         // Nom de la variante (ex: "Rouge", "32GB")
  sku?: string         // SKU de la variante
  image?: string       // Image spécifique de la variante
  price1688?: number   // Prix 1688 spécifique
  stock?: number       // Stock spécifique
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
  category?: string
  description?: string
  tagline?: string
  condition?: 'new' | 'used' | 'refurbished'
  price?: number
  baseCost?: number                    // Coût fournisseur en FCFA
  marginRate?: number                  // Marge commerciale (0% par défaut, ajustable manuellement)
  currency?: string
  image?: string
  gallery?: string[]
  features?: string[]
  requiresQuote?: boolean
  deliveryDays?: number
  stockStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
  stockQuantity?: number
  leadTimeDays?: number
  weightKg?: number
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
  // Configuration achat groupé
  groupBuyEnabled?: boolean           // Active l'achat groupé pour ce produit
  groupBuyMinQty?: number             // Quantité min totale pour lancer la commande
  groupBuyTargetQty?: number          // Quantité cible idéale
  priceTiers?: IPriceTier[]           // Paliers de prix dégressifs
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
  serviceFeeRate?: number // Frais de service (5%, 10%, 15%)
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
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  category: { type: String, index: true },
  description: { type: String },
  tagline: { type: String },
  condition: { type: String, enum: ['new', 'used', 'refurbished'], default: 'new', index: true },
  price: { type: Number },
  baseCost: { type: Number },
  marginRate: { type: Number, default: 0 },  // Marge commerciale par défaut à 0%
  currency: { type: String, default: 'FCFA', enum: ['FCFA', 'EUR', 'USD', 'CNY'] },
  image: { type: String },
  gallery: { type: [String], default: [] },
  features: { type: [String], default: [] },
  requiresQuote: { type: Boolean, default: false },
  deliveryDays: { type: Number, default: 0 },
  stockStatus: { type: String, enum: ['in_stock', 'preorder', 'out_of_stock'], default: 'preorder' },
  stockQuantity: { type: Number, default: 0 },
  leadTimeDays: { type: Number, default: 15 },
  weightKg: { type: Number },
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
  // Configuration achat groupé
  groupBuyEnabled: { type: Boolean, default: false },
  groupBuyMinQty: { type: Number, default: 10 },
  groupBuyTargetQty: { type: Number, default: 50 },
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
    index: false, // Les embeddings ne sont pas indexés par défaut (trop grands)
  },
  embeddingUpdatedAt: { type: Date }
}, { timestamps: true })

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)


