/**
 * Modèle Installation - Module techniciens
 * 
 * Gère les installations de produits par les techniciens
 * - Création d'installation depuis achat produit
 * - Affectation automatique ou manuelle
 * - Suivi du statut
 * - Marketplace intégré
 */

import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IInstallation extends Document {
  // Références
  productId: Types.ObjectId | string
  productName: string
  orderId?: string
  clientId?: Types.ObjectId | string
  clientName: string
  
  // Contact client
  clientContact: {
    name: string
    email?: string
    phone: string
    address: string
  }
  
  // Détails installation
  installationOptions: {
    includeMaterials: boolean
    preferredDate?: Date
    notes?: string
    quantity: number
  }
  
  // Statut
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  
  // Affectation
  assignedTechnicianId?: Types.ObjectId
  assignedTechnicianName?: string
  assignedAt?: Date
  autoAssigned: boolean
  
  // Marketplace
  allowMarketplace: boolean
  bidsCount: number
  bestBidAmount?: number
  bestBidId?: Types.ObjectId
  
  // Dates
  scheduledDate?: Date
  completedDate?: Date
  createdAt: Date
  updatedAt: Date
  
  // Métadonnées
  notes?: string
  metadata?: Record<string, any>
}

const InstallationSchema = new Schema<IInstallation>({
  // Références
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  orderId: {
    type: String,
    index: true
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  clientName: {
    type: String,
    required: [true, 'Le nom du client est requis'],
    trim: true
  },
  
  // Contact client
  clientContact: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide']
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Détails installation
  installationOptions: {
    includeMaterials: {
      type: Boolean,
      default: false
    },
    preferredDate: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Les notes ne peuvent pas dépasser 1000 caractères']
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'La quantité doit être au moins 1'],
      default: 1
    }
  },
  
  // Statut
  status: {
    type: String,
    enum: {
      values: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      message: 'Statut invalide'
    },
    default: 'pending',
    index: true
  },
  
  // Affectation
  assignedTechnicianId: {
    type: Schema.Types.ObjectId,
    ref: 'Technician',
    index: true
  },
  assignedTechnicianName: {
    type: String,
    trim: true
  },
  assignedAt: {
    type: Date
  },
  autoAssigned: {
    type: Boolean,
    default: false
  },
  
  // Marketplace
  allowMarketplace: {
    type: Boolean,
    default: true,
    index: true
  },
  bidsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  bestBidAmount: {
    type: Number,
    min: 0
  },
  bestBidId: {
    type: Schema.Types.ObjectId,
    ref: 'MaintenanceBid'
  },
  
  // Dates
  scheduledDate: {
    type: Date,
    index: true
  },
  completedDate: {
    type: Date
  },
  
  // Métadonnées
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Les notes ne peuvent pas dépasser 2000 caractères']
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Index pour performances
InstallationSchema.index({ status: 1, allowMarketplace: 1 })
InstallationSchema.index({ assignedTechnicianId: 1, status: 1 })
InstallationSchema.index({ clientId: 1, createdAt: -1 })
InstallationSchema.index({ productId: 1 })
InstallationSchema.index({ scheduledDate: 1 })

// Validation avant sauvegarde
InstallationSchema.pre('save', function(next) {
  // Si affecté, s'assurer que les infos technicien sont présentes
  if (this.status === 'assigned' || this.status === 'in_progress') {
    if (!this.assignedTechnicianId || !this.assignedTechnicianName) {
      return next(new Error('Technicien requis pour les statuts assigned ou in_progress'))
    }
    if (!this.assignedAt) {
      this.assignedAt = new Date()
    }
  }
  
  // Si complété, enregistrer la date
  if (this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date()
  }
  
  next()
})

const Installation = mongoose.models.Installation ||
  mongoose.model<IInstallation>('Installation', InstallationSchema)

export default Installation

