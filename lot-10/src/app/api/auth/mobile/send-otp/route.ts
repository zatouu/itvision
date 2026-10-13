import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { sendXeuyOtp } from '@/modules/xeuy'

const otpSendLimiter = new RateLimiter(15 * 60 * 1000, 5)

export async function POST(request: NextRequest) {
  const rl = await applyRateLimit(request, otpSendLimiter)
  if (rl) return rl

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { phone: rawPhone, role: rawRole } = body as any

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    const role = rawRole === 'PROVIDER' ? 'PROVIDER' : 'CLIENT'

    const result = await sendXeuyOtp(rawPhone, role as 'CLIENT' | 'PROVIDER')

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      )
    }

    // Le code de dev n'est jamais exposé en production — sauf pour les numéros
    // whitelistés (OTP_TEST_PHONES) dont le code est de toute façon fixe (000000).
    const exposeDevCode =
      result.devCode && (result.testPhone || process.env.NODE_ENV !== 'production')
    return NextResponse.json({
      success: true,
      phone: result.phone,
      expiresIn: result.expiresIn,
      ...(exposeDevCode ? { _devCode: result.devCode, isFreeMode: true } : {}),
    })
  } catch (err) {
    console.error('[POST /api/auth/mobile/send-otp]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
