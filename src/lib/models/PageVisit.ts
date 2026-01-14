/**
 * Modèle PageVisit - Statistiques de visites
 * 
 * Enregistre toutes les visites de pages pour analytics
 */

import mongoose, { Schema, Document } from 'mongoose'

export interface IPageVisit extends Document {
  // Page visitée
  path: string // Chemin de la page (ex: /produits, /admin)
  pageName: string // Nom de la page (ex: "Catalogue Produits", "Dashboard Admin")
  pageType: 'public' | 'admin' | 'client' | 'technician' // Type de page
  
  // Utilisateur
  userId?: mongoose.Types.ObjectId | string // ID utilisateur si connecté
  userRole?: string // Rôle de l'utilisateur
  isAuthenticated: boolean
  
  // Informations de session
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  referrer?: string // Page d'origine
  
  // Métriques
  duration?: number // Durée de la visite en secondes
  scrollDepth?: number // Pourcentage de scroll (0-100)
  interactions?: number // Nombre d'interactions (clics, etc.)
  
  // Device & Browser
  deviceType?: 'desktop' | 'mobile' | 'tablet'
  browser?: string
  os?: string
  
  // Date
  visitedAt: Date
  createdAt: Date
}

const PageVisitSchema = new Schema<IPageVisit>({
  path: { type: String, required: true, index: true },
  pageName: { type: String, required: true },
  pageType: { 
    type: String, 
    enum: ['public', 'admin', 'client', 'technician'],
    required: true,
    index: true
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  userRole: { type: String, index: true },
  isAuthenticated: { type: Boolean, default: false, index: true },
  sessionId: { type: String, index: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  referrer: { type: String },
  duration: { type: Number },
  scrollDepth: { type: Number },
  interactions: { type: Number, default: 0 },
  deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet'] },
  browser: { type: String },
  os: { type: String },
  visitedAt: { type: Date, required: true, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
})

// Index composés pour les requêtes fréquentes
PageVisitSchema.index({ visitedAt: -1, pageType: 1 })
PageVisitSchema.index({ path: 1, visitedAt: -1 })
PageVisitSchema.index({ userId: 1, visitedAt: -1 })

const PageVisit = mongoose.models.PageVisit ||
  mongoose.model<IPageVisit>('PageVisit', PageVisitSchema)

export default PageVisit

