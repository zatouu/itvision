/**
 * Modèle Mongoose - Contrat de Maintenance
 * Harmonise la gestion des prestations de maintenance post-installation
 */

import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMaintenanceContract extends Document {
  contractNumber: string
  clientId: Types.ObjectId
  projectId?: Types.ObjectId
  
  // Informations du contrat
  name: string
  type: 'preventive' | 'curative' | 'full' | 'basic'
  status: 'draft' | 'active' | 'suspended' | 'expired' | 'cancelled'
  
  // Dates
  startDate: Date
  endDate: Date
  renewalDate?: Date
  signedDate?: Date
  
  // Tarification
  annualPrice: number
  paymentFrequency: 'monthly' | 'quarterly' | 'annual'
  paymentMethod?: string
  
  // Couverture
  coverage: {
    equipmentTypes: string[]
    sitesCovered: string[]
    interventionsIncluded: number // Nombre d'interventions incluses par an
    interventionsUsed: number
    responseTime: string // Ex: "24h", "4h", "2h"
    supportHours: string // Ex: "8h-18h", "24/7"
  }
  
  // Services inclus
  services: Array<{
    name: string
    description: string
    frequency: string // Ex: "mensuel", "trimestriel", "annuel"
    lastPerformed?: Date
    nextScheduled?: Date
  }>
  
  // Équipements couverts
  equipment: Array<{
    type: string
    quantity: number
    location: string
    serialNumbers?: string[]
  }>
  
  // Interventions liées
  interventions: Types.ObjectId[]
  
  // Documents
  documents: Array<{
    name: string
    type: 'contract' | 'invoice' | 'report' | 'other'
    url: string
    uploadDate: Date
  }>
  
  // Historique
  history: Array<{
    date: Date
    action: string
    performedBy: Types.ObjectId
    note?: string
  }>
  
  // Notes et observations
  notes?: string
  specialConditions?: string
  
  // Renouvellement
  autoRenewal: boolean
  renewalNotificationSent: boolean
  renewalProposalId?: Types.ObjectId
  
  // Performance
  stats: {
    totalInterventions: number
    preventiveInterventions: number
    curativeInterventions: number
    averageResponseTime?: number
    clientSatisfaction?: number
  }
  
  createdAt: Date
  updatedAt: Date
}

const MaintenanceContractSchema = new Schema<IMaintenanceContract>({
  contractNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['preventive', 'curative', 'full', 'basic'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'suspended', 'expired', 'cancelled'],
    default: 'draft',
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  renewalDate: Date,
  signedDate: Date,
  annualPrice: {
    type: Number,
    required: true
  },
  paymentFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual'],
    default: 'annual'
  },
  paymentMethod: String,
  coverage: {
    equipmentTypes: [String],
    sitesCovered: [String],
    interventionsIncluded: {
      type: Number,
      default: 4
    },
    interventionsUsed: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: String,
      default: '24h'
    },
    supportHours: {
      type: String,
      default: '8h-18h'
    }
  },
  services: [{
    name: String,
    description: String,
    frequency: String,
    lastPerformed: Date,
    nextScheduled: Date
  }],
  equipment: [{
    type: String,
    quantity: Number,
    location: String,
    serialNumbers: [String]
  }],
  preferredTechnicians: [{
    type: Schema.Types.ObjectId,
    ref: 'Technician'
  }],
  interventions: [{
    type: Schema.Types.ObjectId,
    ref: 'Intervention'
  }],
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['contract', 'invoice', 'report', 'other']
    },
    url: String,
    uploadDate: Date
  }],
  history: [{
    date: Date,
    action: String,
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String
  }],
  notes: String,
  specialConditions: String,
  autoRenewal: {
    type: Boolean,
    default: false
  },
  renewalNotificationSent: {
    type: Boolean,
    default: false
  },
  renewalProposalId: {
    type: Schema.Types.ObjectId,
    ref: 'Quote'
  },
  stats: {
    totalInterventions: {
      type: Number,
      default: 0
    },
    preventiveInterventions: {
      type: Number,
      default: 0
    },
    curativeInterventions: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number,
    clientSatisfaction: Number
  }
}, {
  timestamps: true
})

// Index composé pour recherche rapide
MaintenanceContractSchema.index({ clientId: 1, status: 1 })
MaintenanceContractSchema.index({ endDate: 1, status: 1 }) // Pour les renouvellements

// Méthode pour générer un numéro de contrat
MaintenanceContractSchema.pre('validate', async function(next) {
  if (!this.contractNumber) {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const count = await mongoose.model('MaintenanceContract').countDocuments()
    this.contractNumber = `MC-${year}${month}-${String(count + 1).padStart(4, '0')}`
  }
  next()
})

// Méthode pour vérifier si le contrat est proche de l'expiration
MaintenanceContractSchema.methods.isNearExpiration = function(daysThreshold = 60) {
  const now = new Date()
  const daysUntilExpiration = Math.floor((this.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilExpiration <= daysThreshold && daysUntilExpiration > 0
}

// Méthode pour calculer le taux d'utilisation des interventions
MaintenanceContractSchema.methods.getUsageRate = function() {
  if (this.coverage.interventionsIncluded === 0) return 0
  return (this.coverage.interventionsUsed / this.coverage.interventionsIncluded) * 100
}

const MaintenanceContract = mongoose.models.MaintenanceContract || 
  mongoose.model<IMaintenanceContract>('MaintenanceContract', MaintenanceContractSchema)

export default MaintenanceContract



