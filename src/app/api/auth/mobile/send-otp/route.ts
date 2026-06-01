import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import OtpCode from '@/lib/models/OtpCode'
import { sendSms, normalizePhone } from '@/lib/sms'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'

// Rate limit strict : 5 envois OTP par 15 min par IP
const otpSendLimiter = new RateLimiter(15 * 60 * 1000, 5)

const OTP_LENGTH = 6
const OTP_TTL_MIN = 5

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
      return NextResponse.json({ error: 'Numéro de téléphone invalide. Format attendu : 77 123 45 67' }, { status: 400 })
    }

    // Validation rôle
    const role = rawRole === 'PROVIDER' ? 'PROVIDER' : 'CLIENT'

    await connectMongoose()

    // Vérifier s'il y a un OTP récent non expiré (anti-spam)
    const recent = await OtpCode.findOne({
      phone,
      expiresAt: { $gt: new Date() },
      verified: false,
    }).sort({ createdAt: -1 })

    if (recent) {
      const ageMs = Date.now() - new Date(recent.createdAt).getTime()
      if (ageMs < 60_000) {
        // Moins d'1 minute depuis le dernier envoi
        return NextResponse.json(
          { error: 'Un code vient d\'être envoyé. Attendez 1 minute.' },
          { status: 429 }
        )
      }
    }

    // Générer le code
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000)

    // Sauvegarder en DB
    await OtpCode.create({ phone, code, role, expiresAt })

    // Envoyer le SMS
    const sent = await sendSms(phone, `Votre code Ligey : ${code}. Valide ${OTP_TTL_MIN} minutes.`)

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
      // En dev, on renvoie le code pour faciliter le test
      ...(process.env.NODE_ENV !== 'production' ? { _devCode: code } : {}),
    })
  } catch (err) {
    console.error('[POST /api/auth/mobile/send-otp]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
