/**
 * Xeuy Bi module — types spécifiques à l'app mobile de services.
 * Aucune dépendance vers marketplace ou corporate.
 */

export type XeuyRole = 'CLIENT' | 'PROVIDER'

export interface XeuyUser {
  _id: string
  phone: string
  name: string
  role: XeuyRole
  referralCode?: string
  referralBalance?: number
  referralCount?: number
  referredBy?: string
  isActive: boolean
  providerProfileId?: string
  isNew?: boolean
}

export interface XeuySession {
  userId: string
  role: XeuyRole
  phone: string
  name: string
  domain: 'xeuy'
}

export interface XeuyWallet {
  points: number
  reservedPoints: number
  cashBalance: number
  escrow: number
  lifetimePointsEarned: number
  lifetimePointsSpent: number
  referralCode: string
  referralBalance: number
  referralCount: number
}
