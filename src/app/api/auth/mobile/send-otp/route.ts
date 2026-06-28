import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import OtpCode from '@/lib/models/OtpCode'
import { sendSms, normalizePhone } from '@/lib/sms'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'

// Rate limit : 5 envois OTP par 15 min par IP (30 en free mode pour éviter blocage derrière proxy)
const isFreeMode = process.env.OTP_FREE_MODE === 'true' || process.env.ALLOW_TEST_CODES === 'true' || (process.env.SMS_PROVIDER || 'console') === 'console'
const otpSendLimiter = new RateLimiter(15 * 60 * 1000, isFreeMode ? 30 : 5)

const OTP_LENGTH = 6
const OTP_TTL_MIN = isFreeMode ? 30 : 5
const TEST_CODE = '000000'

function generateOtp(): string {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)]
  }
  return otp
}

export async function POST(request: NextRequest) {
  // Rate limit
  const rl = applyRateLimit(request, otpSendLimiter)
  if (rl) return rl

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { phone: rawPhone, role: rawRole } = body as any

    // Validation numéro
    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }
    const phone = normalizePhone(rawPhone)
    if (!phone) {
      return NextResponse.json({ error: 'Numéro invalide. Exemples : +221 77 123 45 67, +212 6 12 34 56 78, +33 6 12 34 56 78' }, { status: 400 })
    }

    // Validation rôle
    const role = rawRole === 'PROVIDER' ? 'PROVIDER' : 'CLIENT'

    await connectMongoose()

    // Anti-spam : 1 min entre envois (désactivé en free mode)
    if (!isFreeMode) {
      const recent = await OtpCode.findOne({
        phone,
        expiresAt: { $gt: new Date() },
        verified: false,
      }).sort({ createdAt: -1 })

      if (recent) {
        const ageMs = Date.now() - new Date(recent.createdAt).getTime()
        if (ageMs < 60_000) {
          return NextResponse.json(
            { error: 'Un code vient d\'être envoyé. Attendez 1 minute.' },
            { status: 429 }
          )
        }
      }
    }

    // En free mode, utiliser le code fixe 000000 — pas d'envoi SMS
    const code = isFreeMode ? TEST_CODE : generateOtp()
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000)

    // Sauvegarder en DB
    await OtpCode.create({ phone, code, role, expiresAt })

    if (isFreeMode) {
      // Pas d'envoi SMS en free mode — on retourne directement le code
      console.log(`[OTP FREE MODE] ${phone} → code: ${code}`)
      return NextResponse.json({
        success: true,
        phone,
        expiresIn: OTP_TTL_MIN * 60,
        _devCode: code,
        isFreeMode: true,
      })
    }

    // Envoyer le SMS (production)
    const sent = await sendSms(phone, `Votre code Xeuy : ${code}. Valide ${OTP_TTL_MIN} minutes.`)

    if (!sent) {
      return NextResponse.json(
        { error: 'Impossible d\'envoyer le SMS. Réessayez.' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      phone,
      expiresIn: OTP_TTL_MIN * 60,
    })
  } catch (err) {
    console.error('[POST /api/auth/mobile/send-otp]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
