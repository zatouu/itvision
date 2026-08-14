import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { normalizePhone } from '@/lib/sms'
import {
  verifyXeuyOtp,
  createXeuyUser,
  findXeuyUserByPhone,
  signXeuyTokenPair,
  creditXeuyWelcomePoints,
  type XeuyRole,
} from '@/modules/xeuy'

const otpVerifyLimiter = new RateLimiter(15 * 60 * 1000, 10)

export async function POST(request: NextRequest) {
  const rl = await applyRateLimit(request, otpVerifyLimiter)
  if (rl) return rl

  let rawPhone: string | undefined

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { phone: bodyPhone, code, role: rawRole, name: rawName, referralCode: rawReferral } = body as any
    rawPhone = bodyPhone

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json({ error: 'Numéro requis' }, { status: 400 })
    }
    const phone = normalizePhone(rawPhone)
    if (!phone) {
      return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 })
    }
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Code à 6 chiffres requis' }, { status: 400 })
    }

    const role: XeuyRole = rawRole === 'PROVIDER' ? 'PROVIDER' : 'CLIENT'

    // Verify OTP via Xeuy module
    const otpResult = await verifyXeuyOtp(phone, code)
    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error },
        { status: otpResult.status || 500 }
      )
    }

    // Find or create user via Xeuy module
    let user = await findXeuyUserByPhone(phone)

    if (!user) {
      user = await createXeuyUser({
        phone,
        name: rawName,
        role,
        referralCode: rawReferral,
      })

      // Welcome points (best-effort)
      await creditXeuyWelcomePoints(user._id)
    } else if (rawReferral && !user.referredBy) {
      // Backfill referral for existing user
      const { validateXeuyReferralCode } = await import('@/modules/xeuy')
      const referrer = await validateXeuyReferralCode(rawReferral)
      if (referrer) {
        const { default: User } = await import('@/lib/models/User')
        await User.updateOne(
          { _id: user._id },
          { $set: { referredBy: rawReferral.toUpperCase().trim() } }
        )
        user.referredBy = rawReferral.toUpperCase().trim()
      }
    }

    // Generate Xeuy token pair (access 7d + refresh 30d)
    const tokens = await signXeuyTokenPair({
      userId: user._id,
      role: user.role,
      phone: user.phone,
      name: user.name,
    })

    return NextResponse.json({
      success: true,
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isNew: !!user.isNew,
        referralCode: user.referralCode,
        referralBalance: user.referralBalance || 0,
      },
    })
  } catch (err) {
    const error = err as Error
    console.error('[POST /api/auth/mobile/verify-otp]', {
      message: error.message,
      stack: error.stack,
      phone: rawPhone ? '***' + String(rawPhone).slice(-4) : 'unknown',
    })
    return NextResponse.json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 })
  }
}
