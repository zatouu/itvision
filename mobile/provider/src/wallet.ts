import { apiGet } from './api'

export type WalletData = {
  points: number
  cashBalance: number
  escrow: number
  lifetimePointsEarned: number
  lifetimePointsSpent: number
  history: {
    id: string
    kind: string
    points: number
    balanceAfter: number
    description?: string | null
    createdAt: string
  }[]
  config: {
    mode: string
    pointsActive: boolean
    pointsPerWonMission: number
    fcfaPerPoint: number
    freeUntil: string | null
    escrowEnabled: boolean
    escrowMandatory: boolean
    escrowCostPoints: number
    credits: {
      unlockEnabled: boolean
      packs: {
        id: string
        credits: number
        bonusCredits: number
        priceFcfa: number
        popular?: boolean
      }[]
      refundWindowMinutes: number
    }
  }
}

let cached: WalletData | null = null
let cachedAt = 0
const TTL_MS = 30_000

export async function getProviderWallet(force = false): Promise<WalletData> {
  const now = Date.now()
  if (!force && cached && now - cachedAt < TTL_MS) return cached
  const data = await apiGet('/api/wallet')
  cached = data as WalletData
  cachedAt = now
  return cached
}

export function invalidateWalletCache() {
  cached = null
  cachedAt = 0
}
