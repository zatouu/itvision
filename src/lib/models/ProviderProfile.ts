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
  // Core identity
  firstName?: string
  lastName?: string
  businessName?: string
  gender?: 'male' | 'female' | 'other' | ''
  birthDate?: Date
  bio?: string
  spokenLanguages?: string[]
  experienceYears?: number
  // KYC sub-status
  kyc: {
    phoneVerified: boolean
    emailVerified: boolean
    idVerified: boolean
    selfieVerified: boolean
    addressVerified: boolean
    rejectionReason?: string
    status: 'none' | 'pending' | 'approved' | 'rejected'
  }
  // Categories
  serviceCategories: string[]
  primaryCategorySlugs: string[]
  secondaryCategorySlugs: string[]
  subCategoriesByCategory: Record<string, string[]>
  // Zone
  zone?: {
    city?: string
    region?: string
    country?: string
    departments?: string[]
    regions?: string[]
    radiusKm?: number
    coordinates?: [number, number]
  }
  // Availability
  availability: {
    status: 'available_now' | 'busy' | 'paused' | 'vacation' | 'offline'
    workingDays: number[]
    startTime: string
    endTime: string
    lunchStart: string
    lunchEnd: string
    exceptions: Array<{ from: Date; to: Date; reason?: string }>
  }
  // Mission preferences
  missionPreferences: {
    urgent: boolean
    planned: boolean
    troubleshooting: boolean
    installation: boolean
    maintenance: boolean
    longMissions: boolean
    shortMissions: boolean
    minAmount: number
    maxDistanceKm: number
    maxDurationHours: number
  }
  // Notifications
  notifications: {
    channels: {
      push: boolean
      sms: boolean
      email: boolean
      call: boolean
    }
    events: {
      newMission: boolean
      missionAssigned: boolean
      payment: boolean
      message: boolean
      promotion: boolean
      news: boolean
      reminder: boolean
    }
  }
  // Visibility / privacy
  visibility: {
    visible: boolean
    autoAcceptRequests: boolean
    showPhone: boolean
    showCompany: boolean
    showExactLocation: boolean
    publicProfile: boolean
    showReviews: boolean
    showAddress: boolean
    allowAnonymousStats: boolean
  }
  // Portfolio
  portfolio: Array<{
    id: string
    type: 'photo' | 'video' | 'before_after' | 'achievement' | 'certificate' | 'diploma' | 'license'
    url: string
    label?: string
    createdAt?: Date
  }>
  // Payment methods
  paymentMethods: Array<{
    id: string
    type: 'wave' | 'orange_money' | 'free_money' | 'bank_account' | 'wallet_xeuy' | 'iban'
    label: string
    details: string
    isDefault: boolean
  }>
  // Advanced
  advanced: {
    secondaryCategoriesEnabled: boolean
    outOfZoneFallback: boolean
    verifiedClientsOnly: boolean
    depositOnly: boolean
    escrowOnly: boolean
    maxConcurrentMissions: number
    batterySaver: boolean
    highAvailability: boolean
    autoReplyEnabled: boolean
    autoReplyMessage?: string
  }
  // Performance cache (denormalized)
  performance?: {
    totalMissions: number
    completedMissions: number
    successRate: number
    avgResponseMinutes: number
    avgArrivalMinutes: number
    ratingAvg: number
    ratingCount: number
    cancellationRate: number
    revenueFcfa: number
    monthlyTrend: number
  }
  // Premium / subscription cache
  premium?: {
    tier: string
    features: string[]
    visibilityRadiusKm: number
    priorityLevel: number
    credits: number
    expiresAt?: Date
    autoRenewal: boolean
  }
  currentLoad: number
  maxConcurrentMissions?: number
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
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  businessName: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other', ''] },
  birthDate: { type: Date },
  bio: { type: String, trim: true, maxlength: 1000 },
  spokenLanguages: { type: [String], default: [] },
  experienceYears: { type: Number, min: 0, max: 60 },
  kyc: {
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    idVerified: { type: Boolean, default: false },
    selfieVerified: { type: Boolean, default: false },
    addressVerified: { type: Boolean, default: false },
    rejectionReason: { type: String },
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' }
  },
  serviceCategories: { type: [String], default: [] },
  primaryCategorySlugs: { type: [String], default: [] },
  secondaryCategorySlugs: { type: [String], default: [] },
  subCategoriesByCategory: { type: Schema.Types.Mixed, default: {} },
  zone: {
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Sénégal' },
    departments: { type: [String], default: [] },
    regions: { type: [String], default: [] },
    radiusKm: { type: Number, default: 10, min: 1, max: 200 },
    coordinates: { type: [Number], index: '2dsphere' }
  },
  availability: {
    status: { type: String, enum: ['available_now', 'busy', 'paused', 'vacation', 'offline'], default: 'offline' },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    startTime: { type: String, default: '08:00' },
    endTime: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '13:00' },
    lunchEnd: { type: String, default: '14:00' },
    exceptions: { type: [{ from: Date, to: Date, reason: String }], default: [] }
  },
  missionPreferences: {
    urgent: { type: Boolean, default: true },
    planned: { type: Boolean, default: true },
    troubleshooting: { type: Boolean, default: true },
    installation: { type: Boolean, default: true },
    maintenance: { type: Boolean, default: true },
    longMissions: { type: Boolean, default: true },
    shortMissions: { type: Boolean, default: true },
    minAmount: { type: Number, default: 0, min: 0 },
    maxDistanceKm: { type: Number, default: 50, min: 1, max: 200 },
    maxDurationHours: { type: Number, default: 8, min: 1, max: 72 }
  },
  notifications: {
    channels: {
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      call: { type: Boolean, default: false }
    },
    events: {
      newMission: { type: Boolean, default: true },
      missionAssigned: { type: Boolean, default: true },
      payment: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      promotion: { type: Boolean, default: false },
      news: { type: Boolean, default: false },
      reminder: { type: Boolean, default: true }
    }
  },
  visibility: {
    visible: { type: Boolean, default: true },
    autoAcceptRequests: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showCompany: { type: Boolean, default: true },
    showExactLocation: { type: Boolean, default: false },
    publicProfile: { type: Boolean, default: true },
    showReviews: { type: Boolean, default: true },
    showAddress: { type: Boolean, default: false },
    allowAnonymousStats: { type: Boolean, default: true }
  },
  portfolio: {
    type: [{
      id: { type: String, required: true },
      type: { type: String, enum: ['photo', 'video', 'before_after', 'achievement', 'certificate', 'diploma', 'license'], required: true },
      url: { type: String, required: true },
      label: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  paymentMethods: {
    type: [{
      id: { type: String, required: true },
      type: { type: String, enum: ['wave', 'orange_money', 'free_money', 'bank_account', 'wallet_xeuy', 'iban'], required: true },
      label: { type: String, required: true },
      details: { type: String, required: true },
      isDefault: { type: Boolean, default: false }
    }],
    default: []
  },
  advanced: {
    secondaryCategoriesEnabled: { type: Boolean, default: false },
    outOfZoneFallback: { type: Boolean, default: false },
    verifiedClientsOnly: { type: Boolean, default: false },
    depositOnly: { type: Boolean, default: false },
    escrowOnly: { type: Boolean, default: false },
    maxConcurrentMissions: { type: Number, default: 3, min: 1, max: 20 },
    batterySaver: { type: Boolean, default: false },
    highAvailability: { type: Boolean, default: false },
    autoReplyEnabled: { type: Boolean, default: false },
    autoReplyMessage: { type: String, default: '' }
  },
  performance: {
    totalMissions: { type: Number, default: 0 },
    completedMissions: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    avgResponseMinutes: { type: Number, default: 0 },
    avgArrivalMinutes: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    revenueFcfa: { type: Number, default: 0 },
    monthlyTrend: { type: Number, default: 0 }
  },
  premium: {
    tier: { type: String, default: 'free' },
    features: { type: [String], default: [] },
    visibilityRadiusKm: { type: Number, default: 10 },
    priorityLevel: { type: Number, default: 0 },
    credits: { type: Number, default: 0 },
    expiresAt: { type: Date },
    autoRenewal: { type: Boolean, default: false }
  },
  currentLoad: { type: Number, default: 0, min: 0 },
  maxConcurrentMissions: { type: Number, min: 1 }
}, { timestamps: true })

export default (mongoose.models.ProviderProfile as mongoose.Model<IProviderProfile>) ||
  mongoose.model<IProviderProfile>('ProviderProfile', ProviderProfileSchema)
