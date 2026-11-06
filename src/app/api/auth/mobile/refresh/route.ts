import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { rotateXeuyRefreshToken } from '@/modules/xeuy'

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

    try {
      const tokens = await rotateXeuyRefreshToken(refreshToken)

      return NextResponse.json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      })
    } catch (err) {
      const error = err as Error
      const message = error.message

      if (message.includes('réutil') || message.includes('reuse')) {
        return NextResponse.json({ error: 'Token reuse detected' }, { status: 401 })
      }
      if (message.includes('inconnu') || message.includes('invalide') || message.includes('expiré')) {
        return NextResponse.json({ error: 'Refresh token invalide ou expiré' }, { status: 401 })
      }
      if (message.includes('désactivé') || message.includes('introuvable')) {
        return NextResponse.json({ error: 'Compte désactivé ou introuvable' }, { status: 403 })
      }
      if (message.includes('Device')) {
        return NextResponse.json({ error: 'Device mismatch' }, { status: 403 })
      }
      return NextResponse.json({ error: message || 'Refresh token invalide' }, { status: 401 })
    }
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
