export type MissionStatus =
  | 'created'
  | 'pending_offers'
  | 'assigned'
  | 'provider_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type OfferStatus =
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'countered'

export type Provider = 'wave' | 'orange_money' | 'free_money'

export interface ServiceRequest {
  _id: string
  clientId: string
  category: string
  subCategory?: string
  description: string
  budget?: number
  status: MissionStatus
  address?: string
  location?: { type: 'Point'; coordinates: [number, number] }
  media?: Array<{ url: string; type: 'image' | 'audio' }>
  offerCount?: number
  pendingOfferCount?: number
  assignedAt?: string
  providerArrivingAt?: string
  startedAt?: string
  completedAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface Offer {
  _id: string
  requestId: string
  providerId: string
  providerName?: string
  providerPhone?: string
  price: number
  message?: string
  status: OfferStatus
  etaMinutes?: number
  providerRating?: { avg: number; count: number }
  providerVerified?: boolean
  createdAt: string
}

export interface ChatMessage {
  _id: string
  requestId: string
  senderId: string
  senderRole: 'client' | 'provider'
  text: string
  createdAt: string
}

export interface WalletConfig {
  mode: 'free' | 'points' | 'commission'
  pointsActive: boolean
  pointsPerWonMission: number
  fcfaPerPoint: number
  freeUntil: string | null
  escrowEnabled?: boolean
  escrowMandatory?: boolean
  escrowCostPoints?: number
}

export interface WalletData {
  points: number
  cashBalance: number
  lifetimePointsEarned: number
  lifetimePointsSpent: number
  config: WalletConfig
  history: WalletTransaction[]
}

export interface WalletTransaction {
  id: string
  kind: string
  points: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

export interface ServiceCategoryItem {
  id: string
  slug: string
  label: string
  abbr: string
  color: string
  subCategories?: string[]
}

export interface ServiceReview {
  _id: string
  requestId: string
  reviewerId: string
  providerId: string
  rating: number
  comment?: string
  tags?: string[]
  createdAt: string
}
