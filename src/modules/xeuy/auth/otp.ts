/**
 * Xeuy Bi — OTP send/verify logic.
 * Découplé du module auth web. Réutilise OtpCode model + sms util.
 */

import { connectMongoose } from '@/lib/mongoose'
import OtpCode from '@/lib/models/OtpCode'
import { sendSms, normalizePhone } from '@/lib/sms'
import type { XeuyRole } from '../types'

const OTP_LENGTH = 6
const OTP_TTL_MIN = 5
const MAX_ATTEMPTS = 5
const TEST_CODE = '000000'

// Le mode "free" (code fixe + code renvoyé dans la réponse) est strictement
// réservé au développement — jamais actif en production, même si la config le demande.
const isFreeMode =
  process.env.NODE_ENV !== 'production' &&
  (process.env.OTP_FREE_MODE === 'true' ||
    process.env.ALLOW_TEST_CODES === 'true' ||
    (process.env.SMS_PROVIDER || 'console') === 'console')

// En production, le provider SMS doit être réellement configuré — sinon aucun
// OTP ne peut être délivré et on préfère échouer explicitement.
const isSmsConfigured =
  process.env.NODE_ENV !== 'production' ||
  ((process.env.SMS_PROVIDER || 'console') !== 'console')

// Numéros de test whitelistés (démo/recette) : code fixe 000000, aucun SMS
// envoyé — actif même en production, mais strictement limité à ces numéros.
// Le bypass global reste impossible en prod : un code fixe universel
// permettrait de prendre le compte de n'importe quel utilisateur.
const TEST_PHONES = new Set(
  (process.env.OTP_TEST_PHONES || '')
    .split(',')
    .map((p) => normalizePhone(p.trim()))
    .filter((p): p is string => !!p)
)

const isTestPhone = (phone: string) => TEST_PHONES.has(phone)

function generateOtp(): string {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)]
  }
  return otp
}

export interface SendOtpResult {
  success: boolean
  phone: string
  expiresIn: number
  devCode?: string
  // true quand le numéro est whitelisté (OTP_TEST_PHONES) — permet aux routes
  // de traiter l'envoi comme un test même en production (devCode exposable).
  testPhone?: boolean
  error?: string
  status?: number
}

export async function sendXeuyOtp(rawPhone: string, role: XeuyRole): Promise<SendOtpResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) {
    return { success: false, phone: '', expiresIn: 0, error: 'Numéro invalide', status: 400 }
  }

  const testBypass = isTestPhone(phone)

  if (!isSmsConfigured && !testBypass) {
    console.error('[OTP] SMS_PROVIDER non configuré en production — envoi impossible')
    return { success: false, phone: '', expiresIn: 0, error: 'Service SMS indisponible', status: 503 }
  }

  await connectMongoose()

  // Anti-spam: 1 min entre envois
  const recent = await OtpCode.findOne({
    phone,
    expiresAt: { $gt: new Date() },
    verified: false,
  }).sort({ createdAt: -1 })

  if (recent) {
    const ageMs = Date.now() - new Date(recent.createdAt).getTime()
    if (ageMs < 60_000) {
      return {
        success: false,
        phone,
        expiresIn: 0,
        error: 'Un code vient d\'être envoyé. Attendez 1 minute.',
        status: 429,
      }
    }
  }

  const code = isFreeMode || testBypass ? TEST_CODE : generateOtp()
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000)

  const otpDoc = await OtpCode.create({ phone, code, role, expiresAt })

  const sent = isFreeMode || testBypass
    ? true
    : await sendSms(phone, `Votre code Xeuy : ${code}. Valide ${OTP_TTL_MIN} minutes.`)

  if (!sent) {
    // Ne pas garder un code injouable en base — sinon l'anti-spam bloque
    // le retry 1 min alors que l'échec vient du provider (ex: panne Twilio).
    await OtpCode.deleteOne({ _id: otpDoc._id }).catch(() => {})
    return { success: false, phone, expiresIn: 0, error: 'Impossible d\'envoyer le SMS', status: 503 }
  }

  return {
    success: true,
    phone,
    expiresIn: OTP_TTL_MIN * 60,
    ...(isFreeMode || testBypass ? { devCode: code, testPhone: testBypass || undefined } : {}),
  }
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
  status?: number
  otpVerified?: boolean
}

export async function verifyXeuyOtp(
  phone: string,
  code: string
): Promise<VerifyOtpResult> {
  await connectMongoose()

  const otp = await OtpCode.findOne({
    phone,
    expiresAt: { $gt: new Date() },
    verified: false,
  }).sort({ createdAt: -1 })

  if (!otp) {
    return {
      success: false,
      error: 'Code expiré ou introuvable. Demandez un nouveau code.',
      status: 410,
    }
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return {
      success: false,
      error: 'Trop de tentatives. Demandez un nouveau code.',
      status: 429,
    }
  }

  otp.attempts += 1

  if (otp.code !== code) {
    await otp.save()
    const remaining = MAX_ATTEMPTS - otp.attempts
    return {
      success: false,
      error: `Code incorrect. ${remaining} tentative(s) restante(s).`,
      status: 401,
    }
  }

  // Mark verified
  otp.verified = true
  await otp.save()

  return { success: true, otpVerified: true }
}
