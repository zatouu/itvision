import mongoose, { Schema, Document } from 'mongoose'

export interface IIntervention extends Document {
  // Informations de base
  interventionNumber?: string
  title: string
  description?: string
  
  // Client et projet
  clientId?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  technicienId?: mongoose.Types.ObjectId
  maintenanceContractId?: mongoose.Types.ObjectId
  maintenanceActivityId?: mongoose.Types.ObjectId
  isCoveredByContract?: boolean
  
  // Informations anciennes (compatibilité)
  client?: {
    name: string
    address: string
    phone?: string
    zone?: string
  }
  
  // Type et planning
  typeIntervention?: 'maintenance' | 'preventive' | 'installation' | 'repair' | 'inspection' | 'emergency'
  service: string
  priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent'
  estimatedDuration?: number
  requiredSkills?: string[]
  
  // Date et heures
  date?: Date
  heureDebut?: string
  heureFin?: string
  duree?: number // Calculé automatiquement
  scheduledDate?: string
  scheduledTime?: string
  
  // Localisation
  site?: string
  gpsLocation?: {
    lat: number
    lng: number
    timestamp: Date
  }
  
  // Contenu de l'intervention
  activites?: string
  observations?: string
  recommandations?: Array<{
    produit: string
    quantite: number
    commentaire?: string
  }>
  
  // Documentation photo
  photosAvant?: Array<{
    url: string
    caption?: string
    timestamp?: Date
    gps?: { lat: number; lng: number }
  }>
  photosApres?: Array<{
    url: string
    caption?: string
    timestamp?: Date
    gps?: { lat: number; lng: number }
  }>
  
  // Signatures
  signatures?: {
    technician?: {
      signature: string
      name: string
      timestamp: Date
    }
    client?: {
      signature: string
      name: string
      title?: string
      timestamp: Date
    }
  }
  
  // Statut et workflow
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  assignedTechnician?: mongoose.Types.ObjectId
  
  // Devis lié
  quoteId?: mongoose.Types.ObjectId
  quoteGenerated?: boolean
  
  // Feedback client post-intervention
  clientFeedback?: {
    rating: number
    comment?: string
    submittedAt: Date
  }
  clientAcknowledgedAt?: Date

  // Historique
  history?: Array<{
    action: string
    userId: mongoose.Types.ObjectId
    timestamp: Date
    details?: any
  }>

  // Méthodes
  addHistoryEntry?: (action: string, userId: string, details?: any) => void
}

const InterventionSchema = new Schema<IIntervention>({
  // Informations de base
  interventionNumber: { type: String, unique: true, sparse: true },
  title: { type: String, required: true },
  description: { type: String },
  
  // Client et projet
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  technicienId: { type: Schema.Types.ObjectId, ref: 'Technician', index: true },
  maintenanceContractId: { type: Schema.Types.ObjectId, ref: 'MaintenanceContract', index: true },
  maintenanceActivityId: { type: Schema.Types.ObjectId, ref: 'MaintenanceActivity' },
  isCoveredByContract: { type: Boolean, default: false },
  
  // Informations anciennes (compatibilité)
  client: {
    name: { type: String },
    address: { type: String },
    phone: String,
    zone: String
  },
  
  // Type et planning
  typeIntervention: {
    type: String,
    enum: ['maintenance', 'preventive', 'installation', 'repair', 'inspection', 'emergency'],
    default: 'maintenance',
    index: true
  },
  service: { type: String, required: true, index: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical', 'urgent'], 
    default: 'medium', 
    index: true 
  },
  estimatedDuration: { type: Number, default: 2 },
  requiredSkills: [{ type: String }],
  
  // Date et heures
  date: { type: Date, default: Date.now, index: true },
  heureDebut: { type: String, default: '09:00' },
  heureFin: { type: String, default: '10:00' },
  duree: { type: Number }, // Calculé en minutes
  scheduledDate: String,
  scheduledTime: String,
  
  // Localisation
  site: { type: String },
  gpsLocation: {
    lat: { type: Number },
    lng: { type: Number },
    timestamp: { type: Date }
  },
  
  // Contenu de l'intervention
  activites: { type: String },
  observations: { type: String },
  recommandations: [{
    produit: { type: String, required: true },
    quantite: { type: Number, required: true, min: 1 },
    commentaire: { type: String }
  }],
  
  // Documentation photo
  photosAvant: [{
    url: { type: String, required: true },
    caption: { type: String },
    timestamp: { type: Date },
    gps: {
      lat: { type: Number },
      lng: { type: Number }
    }
  }],
  photosApres: [{
    url: { type: String, required: true },
    caption: { type: String },
    timestamp: { type: Date },
    gps: {
      lat: { type: Number },
      lng: { type: Number }
    }
  }],
  
  // Signatures
  signatures: {
    technician: {
      signature: { type: String },
      name: { type: String },
      timestamp: { type: Date }
    },
    client: {
      signature: { type: String },
      name: { type: String },
      title: { type: String },
      timestamp: { type: Date }
    }
  },
  
  // Statut et workflow
  status: { 
    type: String, 
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'pending', 
    index: true 
  },
  assignedTechnician: { type: Schema.Types.ObjectId, ref: 'Technician' },
  
  // Devis lié
  quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
  quoteGenerated: { type: Boolean, default: false },
  
  // Feedback client post-intervention
  clientFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    submittedAt: { type: Date }
  },
  clientAcknowledgedAt: { type: Date },

  // Historique
  history: [{
    action: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    timestamp: { type: Date, default: Date.now },
    details: Schema.Types.Mixed
  }]
}, { timestamps: true })

// Index composites pour les requêtes fréquentes
InterventionSchema.index({ technicienId: 1, date: -1 })
InterventionSchema.index({ clientId: 1, date: -1 })
InterventionSchema.index({ status: 1, date: -1 })
InterventionSchema.index({ 'client.zone': 1 })

// Calcul de durée en minutes, gère le passage à minuit
function calculateDurationMinutes(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) return undefined
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
  }
  const start = parse(startTime)
  const end = parse(endTime)
  if (start === null || end === null) return undefined
  let diff = end - start
  if (diff < 0) diff += 24 * 60 // passage minuit
  return diff
}

// Auto-génération du numéro d'intervention (séquence par année)
InterventionSchema.pre('save', async function(next) {
  if (this.isNew && !this.interventionNumber) {
    const year = new Date().getFullYear()
    const last = await mongoose.model('Intervention')
      .findOne({ interventionNumber: new RegExp(`^INT-${year}-`) })
      .sort({ interventionNumber: -1 })
      .select('interventionNumber')
      .lean() as any
    const lastNum = last?.interventionNumber?.match?.(/-(\d+)$/)?.[1]
    const nextNum = (lastNum ? parseInt(lastNum, 10) : 0) + 1
    this.interventionNumber = `INT-${year}-${String(nextNum).padStart(5, '0')}`
  }

  // Calculer la durée si heures sont fournies
  if (this.heureDebut && this.heureFin) {
    this.duree = calculateDurationMinutes(this.heureDebut, this.heureFin)
  }

  next()
})

// Méthode pour ajouter une entrée à l'historique
InterventionSchema.methods.addHistoryEntry = function(action: string, userId: string, details?: any) {
  if (!this.history) {
    this.history = []
  }
  const safeUserId = mongoose.isValidObjectId(userId)
    ? new mongoose.Types.ObjectId(userId)
    : new mongoose.Types.ObjectId() // fallback pour tokens dev
  this.history.push({
    action,
    userId: safeUserId,
    timestamp: new Date(),
    details
  })
}

export default mongoose.models.Intervention || mongoose.model<IIntervention>('Intervention', InterventionSchema)


