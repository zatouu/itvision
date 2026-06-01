import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import OtpCode from '@/lib/models/OtpCode'
import User from '@/lib/models/User'
import { signAuthTokenWithExpiry } from '@/lib/jwt'
import { normalizePhone } from '@/lib/sms'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { createUniqueReferralCode, validateReferralCode } from '@/lib/referral'
import { creditPoints, getAppConfig } from '@/lib/wallet'

// Rate limit : 10 tentatives de vérification par 15 min par IP
const otpVerifyLimiter = new RateLimiter(15 * 60 * 1000, 10)

const MAX_ATTEMPTS = 5

export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, otpVerifyLimiter)
  if (rl) return rl

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { phone: rawPhone, code, role: rawRole, name: rawName, referralCode: rawReferral } = body as any

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

    const role = rawRole === 'PROVIDER' ? 'PROVIDER' : 'CLIENT'

    await connectMongoose()

    // Trouver le dernier OTP non expiré pour ce numéro
    const otp = await OtpCode.findOne({
      phone,
      expiresAt: { $gt: new Date() },
      verified: false,
    }).sort({ createdAt: -1 })

    if (!otp) {
      return NextResponse.json({ error: 'Code expiré ou introuvable. Demandez un nouveau code.' }, { status: 410 })
    }

    // Vérifier le nombre de tentatives
    if (otp.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Trop de tentatives. Demandez un nouveau code.' }, { status: 429 })
    }

    // Incrémenter les tentatives
    otp.attempts += 1

    if (otp.code !== code) {
      await otp.save()
      const remaining = MAX_ATTEMPTS - otp.attempts
      return NextResponse.json(
        { error: `Code incorrect. ${remaining} tentative(s) restante(s).` },
        { status: 401 }
      )
    }

    // Code correct — marquer comme vérifié
    otp.verified = true
    await otp.save()

    // Trouver ou créer l'utilisateur
    let user = await User.findOne({ phone }).lean() as any

    let referredBy: string | undefined
    if (rawReferral && typeof rawReferral === 'string') {
      const referrer = await validateReferralCode(rawReferral)
      if (referrer) referredBy = rawReferral.toUpperCase().trim()
    }

    if (!user) {
      // Créer un nouvel utilisateur mobile
      const displayName = rawName && typeof rawName === 'string' ? rawName.trim().slice(0, 100) : phone.slice(-9)
      const referralCode = await createUniqueReferralCode()
      const newUser = await User.create({
        username: `mobile_${phone.replace('+', '')}`,
        email: `${phone.replace('+', '')}@mobile.ligey`,
        passwordHash: '___otp_only___',
        name: displayName,
        phone,
        role: role === 'PROVIDER' ? 'TECHNICIAN' : 'CLIENT',
        isActive: true,
        loginAttempts: 0,
        referralCode,
        referredBy,
        referralBalance: 0,
        referralCount: 0,
      })
      user = newUser.toObject()

      // Crédit de bienvenue en points (best effort, ne bloque pas l'inscription)
      try {
        const cfg = await getAppConfig()
        if (cfg.monetization.welcomePoints > 0) {
          await creditPoints(String(user._id), cfg.monetization.welcomePoints, 'welcome', {
            description: 'Crédit de bienvenue',
          })
        }
      } catch (welcomeErr) {
        console.error('[wallet] Erreur crédit bienvenue', welcomeErr)
      }
    } else if (referredBy && !user.referredBy) {
      // Existing user didn't have a referrer — backfill (only once)
      await User.updateOne({ _id: user._id }, { $set: { referredBy } })
      user.referredBy = referredBy
    }

    // Générer le JWT (30 jours)
    const token = await signAuthTokenWithExpiry(
      {
        userId: String(user._id),
        email: user.email,
        role: role === 'PROVIDER' ? 'PROVIDER' : 'CLIENT',
        username: user.username,
        phone,
      },
      '30d'
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        _id: String(user._id),
        name: user.name,
        phone: user.phone,
        role: role,
        isNew: user.name === phone.slice(-9),
        referralCode: user.referralCode,
        referralBalance: user.referralBalance || 0,
      },
    })
  } catch (err) {
    console.error('[POST /api/auth/mobile/verify-otp]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
