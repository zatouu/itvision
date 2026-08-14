import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceReadRateLimiter } from '@/lib/rate-limiter'
import { requireXeuyAuth, getXeuyWallet, getXeuyWalletHistory, getXeuyWalletConfig } from '@/modules/xeuy'
import { loadUserWithProfiles } from '@/lib/user-profiles'
import WalletTransaction from '@/lib/models/WalletTransaction'
import { getOrCreateWallet, getAppConfig, isPointsModeActive } from '@/lib/wallet'

export async function GET(request: NextRequest) {
  const rl = await applyRateLimit(request, serviceReadRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()

    // Try Xeuy auth first (domain-isolated token)
    let userId: string
    let isXeuyUser = false
    try {
      const xeuySession = await requireXeuyAuth(request)
      userId = xeuySession.userId
      isXeuyUser = true
    } catch {
      // Fallback to web auth for backward compatibility
      const webSession = await requireAuth(request)
      userId = webSession.userId
    }

    // Xeuy users: use decoupled wallet service (no MarketplaceProfile)
    if (isXeuyUser) {
      const [wallet, history, config] = await Promise.all([
        getXeuyWallet(userId),
        getXeuyWalletHistory(userId),
        getXeuyWalletConfig(),
      ])

      return NextResponse.json({
        points: wallet.points,
        reservedPoints: wallet.reservedPoints,
        cashBalance: wallet.cashBalance,
        escrow: wallet.escrow,
        lifetimePointsEarned: wallet.lifetimePointsEarned,
        lifetimePointsSpent: wallet.lifetimePointsSpent,
        config,
        history,
        profile: {
          referralCode: wallet.referralCode,
          referralBalance: wallet.referralBalance,
          referralCount: wallet.referralCount,
        },
      })
    }

    // Web users: existing flow with MarketplaceProfile
    const wallet = await getOrCreateWallet(String(userId))
    const cfg = await getAppConfig()
    const pointsActive = await isPointsModeActive()

    const profileData = await loadUserWithProfiles(userId)
    const marketplaceProfile = profileData?.marketplaceProfile

    const history = await WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      points: wallet.points || 0,
      reservedPoints: wallet.reservedPoints || 0,
      cashBalance: wallet.balance || 0,
      escrow: wallet.escrow || 0,
      lifetimePointsEarned: wallet.lifetimePointsEarned || 0,
      lifetimePointsSpent: wallet.lifetimePointsSpent || 0,
      config: {
        mode: cfg.monetization.mode,
        pointsActive,
        pointsPerWonMission: cfg.monetization.pointsPerWonMission,
        fcfaPerPoint: cfg.monetization.fcfaPerPoint,
        freeUntil: cfg.monetization.freeUntil || null,
        escrowEnabled: cfg.escrow.enabled,
        escrowMandatory: cfg.escrow.mandatory,
        escrowCostPoints: cfg.escrow.enabled ? cfg.monetization.escrowCostPoints : 0,
        credits: {
          unlockEnabled: cfg.credits?.unlockEnabled ?? false,
          packs: cfg.credits?.packs || [],
          refundWindowMinutes: cfg.credits?.refundWindowMinutes ?? 10,
        },
      },
      history: history.map((t: any) => ({
        id: String(t._id),
        kind: t.kind,
        points: t.points,
        balanceAfter: t.balanceAfter,
        description: t.description || null,
        createdAt: t.createdAt,
      })),
      cashHistory: (wallet.txns || [])
        .slice(-50)
        .reverse()
        .map((t: any, i: number) => ({
          id: `${t.ref || 'txn'}-${t.createdAt ? new Date(t.createdAt).getTime() : i}`,
          type: t.type,
          amount: t.amount,
          ref: t.ref || null,
          createdAt: t.createdAt,
        })),
      profile: {
        loyaltyTier: marketplaceProfile?.loyaltyTier || marketplaceProfile?.marketplaceTier || 'standard',
        referralBalance: marketplaceProfile?.referralBalance || 0,
        referralCount: marketplaceProfile?.referralCount || 0,
        referralCode: marketplaceProfile?.referralCode || '',
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/wallet]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
