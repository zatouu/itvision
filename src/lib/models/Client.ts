import mongoose, { Document, Schema } from 'mongoose'

export interface IClient extends Document {
  clientId: string
  name: string
  email: string
  phone: string
  passwordHash: string

  // Favoris catalogue (IDs produits)
  favoriteProductIds?: string[]
  
  // Profil
  company?: string
  address?: string
  city?: string
  country?: string
  contactPerson?: string
  notes?: string
  tags?: string[]
  category?: string
  rating?: number
  lastContact?: Date
  
  // Statut
  isActive: boolean
  
  // Permissions
  permissions: {
    canViewReports: boolean
    canRequestMaintenance: boolean
    canAccessPortal: boolean
  }
  
  // Préférences
  preferences: {
    emailNotifications: boolean
    smsNotifications: boolean
    reportFormat: 'pdf' | 'web'
    language: 'fr' | 'en'
  }
  
  // Contrats
  contracts: Array<{
    contractId: string
    type: 'maintenance' | 'installation' | 'support'
    startDate: Date
    endDate?: Date
    status: 'active' | 'expired' | 'suspended'
    services: string[]
  }>
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  loginAttempts: number
  lockedUntil?: Date
}

const ClientSchema = new Schema<IClient>({
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: false,
    minlength: 6
  },

  // Favoris
  favoriteProductIds: {
    type: [String],
    default: []
  },
  
  // Profil
  company: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'Sénégal'
  },
  contactPerson: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  lastContact: {
    type: Date
  },
  
  // Statut
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Permissions
  permissions: {
    canViewReports: {
      type: Boolean,
      default: true
    },
    canRequestMaintenance: {
      type: Boolean,
      default: true
    },
    canAccessPortal: {
      type: Boolean,
      default: true
    }
  },
  
  // Préférences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    reportFormat: {
      type: String,
      enum: ['pdf', 'web'],
      default: 'web'
    },
    language: {
      type: String,
      enum: ['fr', 'en'],
      default: 'fr'
    }
  },
  
  // Contrats
  contracts: [{
    contractId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['maintenance', 'installation', 'support'],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active'
    },
    services: [{
      type: String
    }]
  }],
  
  // Métadonnées
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date
  }
})

// Index pour les recherches
ClientSchema.index({ name: 'text', email: 'text', company: 'text' })
ClientSchema.index({ 'contracts.status': 1 })
ClientSchema.index({ isActive: 1 })

// Middleware pour mettre à jour updatedAt
ClientSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Méthodes d'instance
ClientSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    clientId: this.clientId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    company: this.company,
    address: this.address,
    city: this.city,
    country: this.country,
    contactPerson: this.contactPerson,
    notes: this.notes,
    isActive: this.isActive,
    contracts: this.contracts,
    preferences: this.preferences,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  }
}

ClientSchema.methods.hasActiveContract = function() {
  return this.contracts.some((contract: any) => 
    contract.status === 'active' && 
    (!contract.endDate || contract.endDate > new Date())
  )
}

// Méthodes statiques
ClientSchema.statics.findByClientId = function(clientId: string) {
  return this.findOne({ clientId, isActive: true })
}

ClientSchema.statics.findActiveClients = function() {
  return this.find({ isActive: true }).sort({ name: 1 })
}

const Client = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema)

export default Client