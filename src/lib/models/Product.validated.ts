/**
 * Modèle Product avec validations Mongoose améliorées
 * Refactor complet avec validations strictes
 */

import mongoose, { Schema, Document } from 'mongoose'
import type { 
  StockStatus, 
  ServiceFeeRate, 
  Currency,
  ProductSourcing,
  ShippingOverride,
  ProductVariant,
  ProductVariantGroup
} from '../types/product.types'

export interface IProduct extends Document {
  // Identité
  name: string
  category?: string
  description?: string
  tagline?: string
  
  // Pricing standard
  price?: number
  baseCost?: number
  marginRate?: number
  currency: Currency
  
  // Médias
  image?: string
  gallery: string[]
  
  // Caractéristiques
  features: string[]
  colorOptions: string[] // Conservé pour compatibilité
  variantOptions: string[] // Conservé pour compatibilité
  
  // Variantes avec prix et images (style 1688)
  variantGroups: ProductVariantGroup[]
  
  // Disponibilité
  requiresQuote: boolean
  deliveryDays: number
  stockStatus: StockStatus
  stockQuantity: number
  leadTimeDays: number
  availabilityNote?: string
  
  // Publication
  isPublished: boolean
  isFeatured: boolean
  
  // Logistique - Poids
  netWeightKg?: number // Poids net du produit
  weightKg?: number // Poids brut (avec emballage) - legacy, alias de grossWeightKg
  grossWeightKg?: number // Poids brut avec emballage
  packagingWeightKg?: number // Poids de l'emballage seul
  
  // Logistique - Dimensions
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  
  // Sourcing
  sourcing?: ProductSourcing
  
  // 1688
  price1688?: number
  price1688Currency: Currency
  exchangeRate: number
  serviceFeeRate?: ServiceFeeRate
  insuranceRate?: number
  shippingOverrides: ShippingOverride[]
  
  // Configuration achat groupé
  groupBuyEnabled: boolean
  groupBuyMinQty: number
  groupBuyTargetQty: number
  priceTiers: Array<{
    minQty: number
    maxQty?: number
    price: number
    discount?: number
  }>
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Validations personnalisées
const validateServiceFeeRate = (value: number | undefined): boolean => {
  if (value === undefined) return true
  return value === 5 || value === 10 || value === 15
}

const validateStockStatus = (value: string): boolean => {
  return ['in_stock', 'preorder', 'out_of_stock'].includes(value)
}

const validateCurrency = (value: string): boolean => {
  return ['FCFA', 'EUR', 'USD', 'CNY'].includes(value)
}

const validatePositiveNumber = (value: number | undefined): boolean => {
  if (value === undefined) return true
  return value >= 0
}

const validateDimensions = function(this: IProduct) {
  const { lengthCm, widthCm, heightCm } = this
  if (lengthCm !== undefined || widthCm !== undefined || heightCm !== undefined) {
    if (!lengthCm || !widthCm || !heightCm) {
      throw new Error('Toutes les dimensions (longueur, largeur, hauteur) doivent être renseignées ensemble')
    }
    if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
      throw new Error('Les dimensions doivent être positives')
    }
  }
  return true
}

const calculateVolume = function(this: IProduct) {
  if (this.lengthCm && this.widthCm && this.heightCm) {
    const volumeM3 = (this.lengthCm * this.widthCm * this.heightCm) / 1_000_000
    if (!this.volumeM3 || Math.abs(this.volumeM3 - volumeM3) > 0.001) {
      this.volumeM3 = Math.round(volumeM3 * 1000) / 1000 // Arrondi à 3 décimales
    }
  }
}

// Validation renforcée pour les produits d'import (Chine)
// Objectif: garantir que les produits import disposent
// d'un poids et d'un volume cohérents pour le calcul transport
const validateImportLogistics = function(this: IProduct) {
  const platform = this.sourcing?.platform

  // Même logique que le reste du code: produit considéré comme importé
  // s'il a un prix 1688 ou une plateforme 1688/alibaba/taobao
  const isImported = !!(this.price1688 || (platform && ['1688', 'alibaba', 'taobao'].includes(platform)))

  if (!isImported) return true

  const hasWeight = !!(this.weightKg || this.grossWeightKg || this.netWeightKg)
  const hasVolume = !!(this.volumeM3 || (this.lengthCm && this.widthCm && this.heightCm))

  if (!hasWeight) {
    throw new Error('Les produits d\'import doivent avoir un poids (kg) renseigné pour le calcul du transport')
  }

  if (!hasVolume) {
    throw new Error('Les produits d\'import doivent avoir un volume (m³) ou des dimensions (L, l, H) renseignés pour le calcul du transport')
  }

  return true
}

const ProductSchema = new Schema<IProduct>({
  // Identité
  name: {
    type: String,
    required: [true, 'Le nom du produit est requis'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
    maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères']
  },
  category: {
    type: String,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'La description ne peut pas dépasser 5000 caractères']
  },
  tagline: {
    type: String,
    trim: true,
    maxlength: [200, 'Le tagline ne peut pas dépasser 200 caractères']
  },
  
  // Pricing standard
  price: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le prix doit être positif ou nul'
    }
  },
  baseCost: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le coût de base doit être positif ou nul'
    }
  },
  marginRate: {
    type: Number,
    default: 25,
    min: [0, 'Le taux de marge ne peut pas être négatif'],
    max: [100, 'Le taux de marge ne peut pas dépasser 100%']
  },
  currency: {
    type: String,
    default: 'FCFA',
    enum: {
      values: ['FCFA', 'EUR', 'USD', 'CNY'],
      message: 'Devise invalide. Valeurs acceptées: FCFA, EUR, USD, CNY'
    },
    validate: {
      validator: validateCurrency,
      message: 'Devise invalide'
    }
  },
  
  // Médias
  image: {
    type: String,
    trim: true
  },
  gallery: {
    type: [String],
    default: [],
    validate: {
      validator: (arr: string[]) => arr.length <= 20,
      message: 'Maximum 20 images dans la galerie'
    }
  },
  
  // Caractéristiques
  features: {
    type: [String],
    default: [],
    validate: {
      validator: (arr: string[]) => arr.length <= 50,
      message: 'Maximum 50 caractéristiques'
    }
  },
  colorOptions: {
    type: [String],
    default: []
  },
  variantOptions: {
    type: [String],
    default: []
  },
  
  // Variantes avec prix et images (style 1688)
  variantGroups: {
    type: [new Schema({
      name: { type: String, required: true, trim: true },
      variants: [{
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        sku: { type: String, trim: true },
        image: { type: String, trim: true },
        price1688: { type: Number, min: 0 },
        priceFCFA: { type: Number, min: 0 },
        stock: { type: Number, default: 0, min: 0 },
        isDefault: { type: Boolean, default: false }
      }]
    }, { _id: false })],
    default: []
  },
  
  // Disponibilité
  requiresQuote: {
    type: Boolean,
    default: false
  },
  deliveryDays: {
    type: Number,
    default: 0,
    min: [0, 'Les jours de livraison ne peuvent pas être négatifs']
  },
  stockStatus: {
    type: String,
    enum: {
      values: ['in_stock', 'preorder', 'out_of_stock'],
      message: 'Statut de stock invalide'
    },
    default: 'preorder',
    validate: {
      validator: validateStockStatus,
      message: 'Statut de stock invalide'
    }
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: [0, 'La quantité en stock ne peut pas être négative']
  },
  leadTimeDays: {
    type: Number,
    default: 15,
    min: [0, 'Le délai de livraison ne peut pas être négatif']
  },
  availabilityNote: {
    type: String,
    trim: true,
    maxlength: [500, 'La note de disponibilité ne peut pas dépasser 500 caractères']
  },
  
  // Publication
  isPublished: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Logistique - Poids
  netWeightKg: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le poids net doit être positif ou nul'
    }
  },
  weightKg: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le poids doit être positif ou nul'
    }
  },
  grossWeightKg: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le poids brut doit être positif ou nul'
    }
  },
  lengthCm: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'La longueur doit être positive ou nulle'
    }
  },
  widthCm: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'La largeur doit être positive ou nulle'
    }
  },
  heightCm: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'La hauteur doit être positive ou nulle'
    }
  },
  volumeM3: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le volume doit être positif ou nul'
    }
  },
  packagingWeightKg: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le poids d\'emballage doit être positif ou nul'
    }
  },
  
  // Sourcing
  sourcing: {
    platform: { type: String, trim: true },
    supplierName: { type: String, trim: true },
    supplierContact: { type: String, trim: true },
    productUrl: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: [1000, 'Les notes de sourcing ne peuvent pas dépasser 1000 caractères'] }
  },
  
  // 1688
  price1688: {
    type: Number,
    validate: {
      validator: validatePositiveNumber,
      message: 'Le prix 1688 doit être positif ou nul'
    }
  },
  price1688Currency: {
    type: String,
    default: 'CNY',
    enum: {
      values: ['CNY', 'FCFA', 'EUR', 'USD'],
      message: 'Devise 1688 invalide'
    }
  },
  exchangeRate: {
    type: Number,
    default: 100,
    min: [0.01, 'Le taux de change doit être positif'],
    validate: {
      validator: (value: number) => value > 0,
      message: 'Le taux de change doit être strictement positif'
    }
  },
  serviceFeeRate: {
    type: Number,
    validate: {
      validator: validateServiceFeeRate,
      message: 'Le taux de frais de service doit être 5, 10 ou 15'
    }
  },
  insuranceRate: {
    type: Number,
    min: [0, 'Le taux d\'assurance ne peut pas être négatif'],
    max: [100, 'Le taux d\'assurance ne peut pas dépasser 100%']
  },
  shippingOverrides: {
    type: [new Schema({
      methodId: {
        type: String,
        required: true,
        enum: ['air_express', 'air_15', 'sea_freight']
      },
      ratePerKg: {
        type: Number,
        validate: {
          validator: validatePositiveNumber,
          message: 'Le taux par kg doit être positif ou nul'
        }
      },
      ratePerM3: {
        type: Number,
        validate: {
          validator: validatePositiveNumber,
          message: 'Le taux par m³ doit être positif ou nul'
        }
      },
      flatFee: {
        type: Number,
        validate: {
          validator: validatePositiveNumber,
          message: 'Le forfait doit être positif ou nul'
        }
      }
    }, { _id: false })],
    default: []
  },
  
  // Configuration achat groupé
  groupBuyEnabled: {
    type: Boolean,
    default: false
  },
  groupBuyMinQty: {
    type: Number,
    default: 10,
    min: [1, 'La quantité minimum doit être au moins 1']
  },
  groupBuyTargetQty: {
    type: Number,
    default: 50,
    min: [1, 'La quantité cible doit être au moins 1']
  },
  priceTiers: {
    type: [new Schema({
      minQty: { type: Number, required: true, min: 1 },
      maxQty: { type: Number },
      price: { type: Number, required: true, min: 0 },
      discount: { type: Number, min: 0, max: 100 }
    }, { _id: false })],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Calcul du poids d'emballage et synchronisation
const calculatePackagingWeight = function(this: IProduct) {
  // Synchroniser weightKg et grossWeightKg (legacy support)
  if (this.grossWeightKg && !this.weightKg) {
    this.weightKg = this.grossWeightKg
  } else if (this.weightKg && !this.grossWeightKg) {
    this.grossWeightKg = this.weightKg
  }
  
  // Calculer le poids d'emballage si on a poids net et brut
  if (this.netWeightKg && this.grossWeightKg && !this.packagingWeightKg) {
    const packaging = this.grossWeightKg - this.netWeightKg
    if (packaging >= 0) {
      this.packagingWeightKg = Math.round(packaging * 1000) / 1000
    }
  }
}

// Validation des dimensions avant sauvegarde
ProductSchema.pre('save', function(next) {
  try {
    validateDimensions.call(this)
    validateImportLogistics.call(this)
    calculateVolume.call(this)
    calculatePackagingWeight.call(this)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Index pour performances
ProductSchema.index({ name: 'text', description: 'text', tagline: 'text' })
ProductSchema.index({ category: 1, isPublished: 1 })
ProductSchema.index({ isFeatured: 1, createdAt: -1 })
ProductSchema.index({ price1688: 1 })
ProductSchema.index({ stockStatus: 1, stockQuantity: 1 })

// Export
const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
export default Product

