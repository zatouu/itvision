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

const isFreeMode =
  process.env.OTP_FREE_MODE === 'true' ||
  process.env.ALLOW_TEST_CODES === 'true' ||
  (process.env.SMS_PROVIDER || 'console') === 'console'

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
  error?: string
  status?: number
}

export async function sendXeuyOtp(rawPhone: string, role: XeuyRole): Promise<SendOtpResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) {
    return { success: false, phone: '', expiresIn: 0, error: 'Numéro invalide', status: 400 }
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

  const code = isFreeMode ? TEST_CODE : generateOtp()
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000)

  await OtpCode.create({ phone, code, role, expiresAt })

  const sent = isFreeMode
    ? true
    : await sendSms(phone, `Votre code Xeuy : ${code}. Valide ${OTP_TTL_MIN} minutes.`)

  if (!sent) {
    return { success: false, phone, expiresIn: 0, error: 'Impossible d\'envoyer le SMS', status: 503 }
  }

  return {
    success: true,
    phone,
    expiresIn: OTP_TTL_MIN * 60,
    ...(isFreeMode ? { devCode: code } : {}),
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
