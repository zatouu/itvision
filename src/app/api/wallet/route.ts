import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceReadRateLimiter } from '@/lib/rate-limiter'
import WalletTransaction from '@/lib/models/WalletTransaction'
import { getOrCreateWallet, getAppConfig, isPointsModeActive } from '@/lib/wallet'

export async function GET(request: NextRequest) {
  const rl = applyRateLimit(request, serviceReadRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const wallet = await getOrCreateWallet(String(userId))
    const cfg = await getAppConfig()
    const pointsActive = await isPointsModeActive()

    const history = await WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      points: wallet.points || 0,
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
      },
      history: history.map((t: any) => ({
        id: String(t._id),
        kind: t.kind,
        points: t.points,
        balanceAfter: t.balanceAfter,
        description: t.description || null,
        createdAt: t.createdAt,
      })),
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/wallet]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
