import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { verifyXeuyRefreshToken, signXeuyTokenPair } from '@/modules/xeuy'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'

const refreshLimiter = new RateLimiter(15 * 60 * 1000, 20)

export async function POST(request: NextRequest) {
  const rl = await applyRateLimit(request, refreshLimiter)
  if (rl) return rl

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { refreshToken } = body as { refreshToken?: string }
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ error: 'Refresh token requis' }, { status: 400 })
    }

    let session
    try {
      session = await verifyXeuyRefreshToken(refreshToken)
    } catch {
      return NextResponse.json({ error: 'Refresh token invalide ou expiré' }, { status: 401 })
    }

    await connectMongoose()
    const user = await User.findById(session.userId).lean() as any
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Compte désactivé ou introuvable' }, { status: 403 })
    }

    const tokens = await signXeuyTokenPair({
      userId: session.userId,
      role: session.role,
      phone: session.phone,
      name: user.name || session.name,
    })

    return NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    })
  } catch (err) {
    const error = err as Error
    console.error('[POST /api/auth/mobile/refresh]', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 })
  }
}
