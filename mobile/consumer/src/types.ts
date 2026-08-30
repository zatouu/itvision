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

export type UserRole = 'client' | 'provider'

export type Provider = 'wave' | 'orange_money' | 'free_money' | 'cash'

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
  reservedPoints: number
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

export interface CounterOffer {
  _id: string
  offerId: string
  requestId: string
  proposedBy: 'client' | 'provider'
  amount: number
  expiresAt: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
}

export interface Mission extends ServiceRequest {
  acceptedOffer?: Offer
  provider?: ProviderProfile
  payment?: { status: string; amount: number }
  review?: ServiceReview
}

export interface ProviderProfile {
  _id: string
  name: string
  phone?: string
  role: 'provider'
  trade?: string
  category?: string
  rating: { avg: number; count: number }
  missionsCount: number
  verified: boolean
  about?: string
  specialties?: string[]
  portfolio?: { id: string; url: string; label: string; beforeAfter?: boolean }[]
  recentReviews?: ServiceReview[]
  avatarUrl?: string
  isOnline?: boolean
  location?: { lat: number; lng: number }
}

export interface ClientProfile {
  _id: string
  name: string
  phone?: string
  role: 'client'
  avatarUrl?: string
  savedAddresses?: Address[]
}

export interface Address {
  id: string
  label: string
  street?: string
  city?: string
  area?: string
  coordinates?: { lat: number; lng: number }
  instructions?: string
  floor?: string
  door?: string
}

export type NotificationType = 'offer' | 'message' | 'mission' | 'payment' | 'system'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  data?: Record<string, unknown>
  createdAt: string
}

export interface WalletEntry {
  id: string
  kind: 'income' | 'commission' | 'withdrawal' | 'topup'
  amount: number
  currency: 'FCFA'
  status: 'available' | 'pending' | 'debit'
  label: string
  date: string
  requestId?: string
}
