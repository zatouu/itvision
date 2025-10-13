import mongoose, { Document, Schema } from 'mongoose'

export interface ITechnician extends Document {
  technicianId: string
  name: string
  email: string
  phone: string
  passwordHash: string
  
  // Profil
  profilePhoto?: string
  specialties: string[]
  certifications: string[]
  experience: number // années
  
  // Statut
  isActive: boolean
  isAvailable: boolean
  currentLocation?: {
    lat: number
    lng: number
    lastUpdate: Date
  }
  
  // Permissions
  permissions: {
    canCreateReports: boolean
    canEditOwnReports: boolean
    canDeleteDrafts: boolean
    allowedInterventionTypes: string[]
    maxReportValue?: number // limite si applicable
  }
  
  // Statistiques
  stats: {
    totalReports: number
    averageRating: number
    completionRate: number
    averageResponseTime: number // minutes
    onTimeRate: number // pourcentage ponctualité
  }
  
  // Préférences
  preferences: {
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
    }
    workingHours: {
      start: string
      end: string
      weekends: boolean
    }
    language: string
  }
  
  // Géolocalisation tracking
  locationHistory: {
    timestamp: Date
    lat: number
    lng: number
    accuracy: number
    activity?: string // 'traveling' | 'on_site' | 'break'
  }[]
  
  // Sessions et sécurité
  lastLogin?: Date
  lastLocationUpdate?: Date
  deviceTokens: string[] // pour notifications push
  
  // Équipe et hiérarchie
  teamId?: mongoose.Types.ObjectId
  supervisorId?: mongoose.Types.ObjectId
  
  createdAt: Date
  updatedAt: Date
}

const TechnicianSchema = new Schema<ITechnician>({
  technicianId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  
  profilePhoto: { type: String },
  specialties: [{ type: String }],
  certifications: [{ type: String }],
  experience: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    lat: Number,
    lng: Number,
    lastUpdate: Date
  },
  
  permissions: {
    canCreateReports: { type: Boolean, default: true },
    canEditOwnReports: { type: Boolean, default: true },
    canDeleteDrafts: { type: Boolean, default: true },
    allowedInterventionTypes: [{ type: String }],
    maxReportValue: Number
  },
  
  stats: {
    totalReports: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    onTimeRate: { type: Number, default: 0 }
  },
  
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '18:00' },
      weekends: { type: Boolean, default: false }
    },
    language: { type: String, default: 'fr' }
  },
  
  locationHistory: [{
    timestamp: { type: Date, default: Date.now },
    lat: Number,
    lng: Number,
    accuracy: Number,
    activity: { type: String, enum: ['traveling', 'on_site', 'break'] }
  }],
  
  lastLogin: Date,
  lastLocationUpdate: Date,
  deviceTokens: [{ type: String }],
  
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  supervisorId: { type: Schema.Types.ObjectId, ref: 'Technician' }
}, {
  timestamps: true
})

// Index pour les recherches
TechnicianSchema.index({ isActive: 1, isAvailable: 1 })
TechnicianSchema.index({ specialties: 1 })
TechnicianSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 })

// Middleware pour auto-générer technicianId
TechnicianSchema.pre('save', function(next) {
  if (!this.technicianId) {
    const random = crypto.randomUUID().replace(/-/g, '').substr(0, 3).toUpperCase()
    this.technicianId = `TECH-${random}`
  }
  next()
})

// Méthodes d'instance
TechnicianSchema.methods.updateLocation = function(lat: number, lng: number, accuracy: number) {
  this.currentLocation = {
    lat,
    lng,
    lastUpdate: new Date()
  }
  
  // Garder historique des 100 dernières positions
  this.locationHistory.push({
    timestamp: new Date(),
    lat,
    lng,
    accuracy
  })
  
  if (this.locationHistory.length > 100) {
    this.locationHistory = this.locationHistory.slice(-100)
  }
  
  this.lastLocationUpdate = new Date()
}

TechnicianSchema.methods.calculateStats = async function() {
  // Cette méthode devra être implémentée pour calculer les stats depuis les rapports
  // Pour l'instant, placeholder
  return this.stats
}

export default mongoose.models.Technician || mongoose.model<ITechnician>('Technician', TechnicianSchema)