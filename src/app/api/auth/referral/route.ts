import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceReadRateLimiter } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  const rl = applyRateLimit(request, serviceReadRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const user = await User.findById(userId).lean() as any
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Count how many users were referred by this user's code
    const referredCount = await User.countDocuments({ referredBy: user.referralCode })

    return NextResponse.json({
      referralCode: user.referralCode,
      referralBalance: user.referralBalance || 0,
      referralCount: user.referralCount || 0,
      referredCount, // total users who used this code (may differ from credited count)
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/auth/referral]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
