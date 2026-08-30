import mongoose, { Schema, Document } from 'mongoose'

export interface IProviderProfile extends Document {
  userId: mongoose.Types.ObjectId
  kycVerified: boolean
  providerStats: {
    completedMissions: number
    cancelledByProvider: number
    cancelledByClient: number
    reliabilityScore: number
    lastUpdatedAt?: Date
  }
  serviceCategories: string[]
  secondaryCategories?: string[]
  zone?: {
    city?: string
    region?: string
    coordinates?: [number, number]
    radiusKm?: number
    departments?: string[]
    regions?: string[]
  }
  coverUrl?: string
  maxConcurrentMissions?: number
  availabilityStatus?: 'Disponible' | 'Occupé' | 'En pause' | 'En vacances' | 'Hors ligne'
  visible?: boolean
  scoreXeuy?: number
  preferences?: any
  currentLoad: number
  createdAt: Date
  updatedAt: Date
}

const ProviderProfileSchema = new Schema<IProviderProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
    ref: 'User'
  },
  kycVerified: { type: Boolean, default: false, index: true },
  providerStats: {
    completedMissions: { type: Number, default: 0, min: 0 },
    cancelledByProvider: { type: Number, default: 0, min: 0 },
    cancelledByClient: { type: Number, default: 0, min: 0 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
    lastUpdatedAt: { type: Date }
  },
  serviceCategories: { type: [String], default: [] },
  secondaryCategories: { type: [String], default: [] },
  zone: {
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    coordinates: { type: [Number], index: '2dsphere' },
    radiusKm: { type: Number, default: 10, min: 1 },
    departments: { type: [String], default: [] },
    regions: { type: [String], default: [] }
  },
  coverUrl: { type: String },
  currentLoad: { type: Number, default: 0, min: 0 },
  maxConcurrentMissions: { type: Number, min: 1 },
  availabilityStatus: { type: String, default: 'Disponible' },
  visible: { type: Boolean, default: true, index: true },
  scoreXeuy: { type: Number, default: 0, min: 0, max: 100 },
  preferences: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true })

export default (mongoose.models.ProviderProfile as mongoose.Model<IProviderProfile>) ||
  mongoose.model<IProviderProfile>('ProviderProfile', ProviderProfileSchema)
