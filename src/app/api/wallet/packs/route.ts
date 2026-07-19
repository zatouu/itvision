import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceReadRateLimiter } from '@/lib/rate-limiter'
import { getAppConfig } from '@/lib/wallet'

/**
 * GET /api/wallet/packs
 * Retourne les packs de crédits configurables depuis AppConfig.
 */
export async function GET(request: NextRequest) {
  const rl = await applyRateLimit(request, serviceReadRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    await requireAuth(request)
    const cfg = await getAppConfig()
    return NextResponse.json({
      packs: cfg.credits?.packs || [],
      unlockEnabled: cfg.credits?.unlockEnabled ?? false,
      fcfaPerPoint: cfg.monetization?.fcfaPerPoint ?? 100,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/wallet/packs]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
