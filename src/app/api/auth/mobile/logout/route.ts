import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { revokeXeuyRefreshToken } from '@/modules/xeuy'
import { connectMongoose } from '@/lib/mongoose'
import PushToken from '@/lib/models/PushToken'
import { requireAuth } from '@/lib/jwt'

const logoutLimiter = new RateLimiter(15 * 60 * 1000, 10)

export async function POST(request: NextRequest) {
  const rl = await applyRateLimit(request, logoutLimiter)
  if (rl) return rl

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { refreshToken } = body as { refreshToken?: string }

    // 1. Revoke refresh token
    if (refreshToken && typeof refreshToken === 'string') {
      await revokeXeuyRefreshToken(refreshToken)
    }

    // 2. Garde-fou: remove ALL push tokens for this user
    //    (client-side unregisterPushToken may have failed due to network issues)
    try {
      const { userId } = await requireAuth(request)
      await connectMongoose()
      await PushToken.deleteMany({ userId })
    } catch {
      // If auth fails (token already expired), skip — client should have unregistered
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // Logout should never fail — return success even on error
    console.error('[POST /api/auth/mobile/logout]', (err as Error).message)
    return NextResponse.json({ success: true })
  }
}
