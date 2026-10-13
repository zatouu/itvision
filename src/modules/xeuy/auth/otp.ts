/**
 * Xeuy Bi — OTP send/verify logic.
 * Découplé du module auth web. Réutilise OtpCode model + sms util.
 */

import { createHmac, randomInt, timingSafeEqual } from 'crypto'
import { connectMongoose } from '@/lib/mongoose'
import OtpCode from '@/lib/models/OtpCode'
import { sendSms, normalizePhone } from '@/lib/sms'
import { getJwtSecretString } from '@/lib/jwt-secret'
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
//
// Exception explicite : OTP_TEST_PHONES=* active le code fixe pour TOUS les
// numéros (phase de test pré-lancement uniquement). Quiconque connaît un
// numéro peut alors se connecter au compte associé — À RETIRER avant le
// lancement public (remettre la liste de numéros ou vider la variable).
const TEST_PHONE_ENTRIES = (process.env.OTP_TEST_PHONES || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)

const ALLOW_ALL_TEST_PHONES = TEST_PHONE_ENTRIES.includes('*')

const TEST_PHONES = new Set(
  TEST_PHONE_ENTRIES
    .map((p) => normalizePhone(p))
    .filter((p): p is string => !!p)
)

if (ALLOW_ALL_TEST_PHONES) {
  console.warn(
    '[OTP] ⚠️  OTP_TEST_PHONES=* — TOUS les numéros reçoivent le code fixe 000000 ' +
    '(mode test, aucun SMS). À retirer avant le lancement public.'
  )
}

const isTestPhone = (phone: string) => ALLOW_ALL_TEST_PHONES || TEST_PHONES.has(phone)

function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0')
}

function hashOtp(phone: string, code: string): string {
  return createHmac('sha256', getJwtSecretString()).update(`otp:${phone}:${code}`).digest('hex')
}

function otpMatches(storedHash: string, phone: string, code: string): boolean {
  const a = Buffer.from(storedHash, 'utf-8')
  const b = Buffer.from(hashOtp(phone, code), 'utf-8')
  return a.length === b.length && timingSafeEqual(a, b)
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

  const otpDoc = await OtpCode.create({ phone, code: hashOtp(phone, code), role, expiresAt })

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

  // Incrément atomique : des requêtes parallèles ne doivent pas dépasser MAX_ATTEMPTS
  const counted = await OtpCode.findOneAndUpdate(
    { _id: otp._id, verified: false, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  )
  if (!counted) {
    return {
      success: false,
      error: 'Trop de tentatives. Demandez un nouveau code.',
      status: 429,
    }
  }

  if (!otpMatches(counted.code, counted.phone, code)) {
    const remaining = MAX_ATTEMPTS - counted.attempts
    return {
      success: false,
      error: `Code incorrect. ${remaining} tentative(s) restante(s).`,
      status: 401,
    }
  }

  // Usage unique : un même code ne peut valider qu'une seule requête
  const consumed = await OtpCode.updateOne({ _id: counted._id, verified: false }, { $set: { verified: true } })
  if (consumed.modifiedCount !== 1) {
    return {
      success: false,
      error: 'Code déjà utilisé. Demandez un nouveau code.',
      status: 410,
    }
  }

  return { success: true, otpVerified: true }
}
