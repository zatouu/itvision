import mongoose, { Document, Schema } from 'mongoose'
import crypto from 'crypto'

export interface IMaintenanceReportIssue {
  reference: string
  component: string
  location?: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact?: string
  immediateAction?: string
  photos?: string[]
  requiresQuote: boolean
  recommendedSolution?: string
  estimatedCost?: number
  estimatedDurationHours?: number
  status: 'identified' | 'in_progress' | 'resolved'
}

export interface IMaintenanceReportMaterial {
  name: string
  sku?: string
  category?: string
  quantity: number
  unitCost?: number
  unitPrice?: number
  totalCost?: number
  totalPrice?: number
  supplierReference?: string
}

export interface IMaintenanceReportRecommendation {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  recommendedDate?: Date
  estimatedCost?: number
  estimatedDurationHours?: number
  requiresQuote: boolean
  quoteId?: mongoose.Types.ObjectId
  status: 'pending' | 'quoted' | 'approved' | 'rejected' | 'completed'
  clientDecision?: {
    status: 'pending' | 'approved' | 'rejected'
    decidedAt?: Date
    comments?: string
  }
}

export interface IMaintenanceReportBilling {
  needsQuote: boolean
  quoteId?: mongoose.Types.ObjectId
  quoteStatus: 'not_started' | 'draft' | 'sent' | 'approved' | 'rejected'
  invoiceId?: mongoose.Types.ObjectId
  invoiceStatus: 'not_started' | 'draft' | 'sent' | 'paid' | 'overdue'
  lastUpdatedAt?: Date
}

export interface IMaintenanceReportNextAction {
  title: string
  scheduledDate?: Date
  assignedTo?: mongoose.Types.ObjectId
  notes?: string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
}

export interface IMaintenanceReport extends Document {
  reportId: string
  technicianId: mongoose.Types.ObjectId
  clientId: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId
  
  // Informations intervention
  interventionDate: Date
  startTime: string
  endTime: string
  duration: number // en minutes
  site: string
  interventionType: 'maintenance' | 'installation' | 'repair' | 'inspection' | 'emergency'
  
  // Template utilisé
  templateId: string
  templateVersion: string
  
  // Données du rapport
  formData: {
    [key: string]: any
  }
  
    // Observations
    initialObservations: string
    problemDescription?: string
    problemSeverity: 'low' | 'medium' | 'high' | 'critical'

    // Tâches et résultats
    tasksPerformed: string[]
    results: string
    recommendations: string[]

    // Données structurées pour suivi
    issuesDetected: IMaintenanceReportIssue[]
    materialsUsed: IMaintenanceReportMaterial[]
    followUpRecommendations: IMaintenanceReportRecommendation[]
    nextActions: IMaintenanceReportNextAction[]
    billing: IMaintenanceReportBilling
    clientAcknowledgement?: {
      status: 'pending' | 'acknowledged' | 'contested'
      name?: string
      signedAt?: Date
      comments?: string
    }
  
  // Fichiers et photos
  photos: {
    before: {
      url: string
      caption?: string
      timestamp: Date
      gps?: { lat: number, lng: number }
    }[]
    after: {
      url: string
      caption?: string
      timestamp: Date
      gps?: { lat: number, lng: number }
    }[]
  }
  documents: {
    name: string
    url: string
    type: string
    uploadDate: Date
  }[]
  
  // Signatures
  signatures: {
    technician?: {
      signature: string // base64
      name: string
      timestamp: Date
    }
    client?: {
      signature: string // base64
      name: string
      title: string
      timestamp: Date
    }
  }
  
  // Géolocalisation
  gpsLocation?: {
    lat: number
    lng: number
    accuracy: number
    timestamp: Date
  }
  
  // Workflow et validation
  status: 'draft' | 'pending_validation' | 'validated' | 'rejected' | 'published' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Validation admin
  validation?: {
    validatedBy: mongoose.Types.ObjectId
    validatedAt: Date
    action: 'approved' | 'rejected'
    comments: string
    adminSignature?: string
  }
  
  // Publication client
  publishedToClient: boolean
  publishedAt?: Date
  clientViewedAt?: Date
  clientFeedback?: {
    rating: number // 1-5
    comment: string
    timestamp: Date
  }
  
  // Métadonnées
  version: number
  history: {
    action: string
    timestamp: Date
    userId: mongoose.Types.ObjectId
    details?: any
  }[]
  
  // Analytics
  analytics: {
    timeToComplete: number // durée création rapport en minutes
    revisionCount: number
    adminValidationTime?: number // temps validation admin
  }
}

const MaintenanceReportSchema = new Schema<IMaintenanceReport>({
  reportId: { type: String, required: true, unique: true },
  technicianId: { type: Schema.Types.ObjectId, ref: 'Technician', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  
  interventionDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
  site: { type: String, required: true },
  interventionType: { 
    type: String, 
    enum: ['maintenance', 'installation', 'repair', 'inspection', 'emergency'],
    required: true 
  },
  
  templateId: { type: String, required: true },
  templateVersion: { type: String, required: true },
  
  formData: { type: Schema.Types.Mixed, default: {} },
  
  initialObservations: { type: String, required: true },
  problemDescription: { type: String },
  problemSeverity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  tasksPerformed: [{ type: String }],
  results: { type: String, required: true },
    recommendations: [{ type: String }],

    issuesDetected: {
      type: [{
        reference: { type: String, required: true },
        component: { type: String, required: true },
        location: String,
        description: { type: String, required: true },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        },
        impact: String,
        immediateAction: String,
        photos: [{ type: String }],
        requiresQuote: { type: Boolean, default: false },
        recommendedSolution: String,
        estimatedCost: Number,
        estimatedDurationHours: Number,
        status: {
          type: String,
          enum: ['identified', 'in_progress', 'resolved'],
          default: 'identified'
        }
      }],
      default: []
    },

    materialsUsed: {
      type: [{
        name: { type: String, required: true },
        sku: String,
        category: String,
        quantity: { type: Number, default: 1 },
        unitCost: Number,
        unitPrice: Number,
        totalCost: Number,
        totalPrice: Number,
        supplierReference: String
      }],
      default: []
    },

    followUpRecommendations: {
      type: [{
        title: { type: String, required: true },
        description: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium'
        },
        category: String,
        recommendedDate: Date,
        estimatedCost: Number,
        estimatedDurationHours: Number,
        requiresQuote: { type: Boolean, default: true },
        quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
        status: {
          type: String,
          enum: ['pending', 'quoted', 'approved', 'rejected', 'completed'],
          default: 'pending'
        },
        clientDecision: {
          status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
          },
          decidedAt: Date,
          comments: String
        }
      }],
      default: []
    },

    nextActions: {
      type: [{
        title: { type: String, required: true },
        scheduledDate: Date,
        assignedTo: { type: Schema.Types.ObjectId, ref: 'Technician' },
        notes: String,
        status: {
          type: String,
          enum: ['pending', 'scheduled', 'completed', 'cancelled'],
          default: 'pending'
        }
      }],
      default: []
    },

    billing: {
      needsQuote: { type: Boolean, default: false },
      quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
      quoteStatus: {
        type: String,
        enum: ['not_started', 'draft', 'sent', 'approved', 'rejected'],
        default: 'not_started'
      },
      invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
      invoiceStatus: {
        type: String,
        enum: ['not_started', 'draft', 'sent', 'paid', 'overdue'],
        default: 'not_started'
      },
      lastUpdatedAt: { type: Date, default: Date.now }
    },

    clientAcknowledgement: {
      status: {
        type: String,
        enum: ['pending', 'acknowledged', 'contested'],
        default: 'pending'
      },
      name: String,
      signedAt: Date,
      comments: String
    },
  
  photos: {
    before: [{
      url: String,
      caption: String,
      timestamp: { type: Date, default: Date.now },
      gps: {
        lat: Number,
        lng: Number
      }
    }],
    after: [{
      url: String,
      caption: String,
      timestamp: { type: Date, default: Date.now },
      gps: {
        lat: Number,
        lng: Number
      }
    }]
  },
  
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  signatures: {
    technician: {
      signature: String,
      name: String,
      timestamp: Date
    },
    client: {
      signature: String,
      name: String,
      title: String,
      timestamp: Date
    }
  },
  
  gpsLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },
  
  status: { 
    type: String, 
    enum: ['draft', 'pending_validation', 'validated', 'rejected', 'published', 'archived'],
    default: 'draft'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  validation: {
    validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    validatedAt: Date,
    action: { type: String, enum: ['approved', 'rejected'] },
    comments: String,
    adminSignature: String
  },
  
  publishedToClient: { type: Boolean, default: false },
  publishedAt: Date,
  clientViewedAt: Date,
  clientFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    timestamp: Date
  },
  
  version: { type: Number, default: 1 },
  history: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    details: Schema.Types.Mixed
  }],
  
  analytics: {
    timeToComplete: Number,
    revisionCount: { type: Number, default: 0 },
    adminValidationTime: Number
  }
}, {
  timestamps: true
})

// Index pour les recherches fréquentes
MaintenanceReportSchema.index({ status: 1, interventionDate: -1 })
MaintenanceReportSchema.index({ technicianId: 1, interventionDate: -1 })
MaintenanceReportSchema.index({ clientId: 1, interventionDate: -1 })
MaintenanceReportSchema.index({ projectId: 1 })
MaintenanceReportSchema.index({ 'billing.quoteStatus': 1 })
MaintenanceReportSchema.index({ 'followUpRecommendations.status': 1 })
MaintenanceReportSchema.index({ 'issuesDetected.severity': 1 })

// Middleware pour auto-générer reportId
MaintenanceReportSchema.pre('save', function(next) {
  if (!this.reportId) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = crypto.randomUUID().replace(/-/g, '').substr(0, 4).toUpperCase()
    this.reportId = `RPT-${date}-${random}`
  }
  next()
})

// Méthodes d'instance
MaintenanceReportSchema.methods.addHistoryEntry = function(action: string, userId: string, details?: any) {
  this.history.push({
    action,
    userId,
    details,
    timestamp: new Date()
  })
}

MaintenanceReportSchema.methods.calculateDuration = function() {
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01T${this.startTime}`)
    const end = new Date(`2000-01-01T${this.endTime}`)
    this.duration = Math.round((end.getTime() - start.getTime()) / 60000) // minutes
  }
}

export default mongoose.models.MaintenanceReport || mongoose.model<IMaintenanceReport>('MaintenanceReport', MaintenanceReportSchema)