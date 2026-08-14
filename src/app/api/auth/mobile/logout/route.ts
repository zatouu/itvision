import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { revokeXeuyRefreshToken } from '@/modules/xeuy'

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
    if (!refreshToken || typeof refreshToken !== 'string') {
      // Still return success — logout should never fail client-side
      return NextResponse.json({ success: true })
    }

    await revokeXeuyRefreshToken(refreshToken)

    return NextResponse.json({ success: true })
  } catch (err) {
    // Logout should never fail — return success even on error
    console.error('[POST /api/auth/mobile/logout]', (err as Error).message)
    return NextResponse.json({ success: true })
  }
}
