/**
 * Xeuy Bi — Authentification OTP découplée du web.
 * - JWT avec claim `domain: 'xeuy'` pour isolation totale.
 * - Access token 1h (court, limité le risque si volé)
 * - Refresh token 30j stocké en DB (révocable, rotation, device binding)
 * - Token family tracking (détection de vol)
 */

import { jwtVerify, SignJWT } from 'jose'
import { createHash, randomUUID } from 'crypto'
import { getJwtSecretKey } from '@/lib/jwt-secret'
import type { NextRequest } from 'next/server'
import type { XeuyRole, XeuySession } from '../types'

const XEUY_DOMAIN = 'xeuy' as const
const ACCESS_TOKEN_TTL = '1h'
const REFRESH_TOKEN_TTL = '30d'
const REFRESH_TYPE = 'xeuy-refresh' as const

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface XeuyTokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export function extractXeuyToken(request: NextRequest): string | null {
  return (
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.cookies.get('xeuy-token')?.value ||
    null
  )
}

export async function signXeuyToken(payload: {
  userId: string
  role: XeuyRole
  phone: string
  name: string
  deviceId?: string
}): Promise<string> {
  return new SignJWT({ ...payload, domain: XEUY_DOMAIN })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getJwtSecretKey())
}

export async function signXeuyRefreshToken(payload: {
  userId: string
  role: XeuyRole
  phone: string
  name: string
  deviceId: string
  familyId: string
}): Promise<string> {
  return new SignJWT({
    ...payload,
    domain: XEUY_DOMAIN,
    typ: REFRESH_TYPE,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getJwtSecretKey())
}

/**
 * Issue a new token pair and persist the refresh token hash in DB.
 * Must be called after successful OTP verification.
 */
export async function issueXeuyTokenPair(payload: {
  userId: string
  role: XeuyRole
  phone: string
  name: string
  deviceId: string
}): Promise<XeuyTokenPair> {
  const { connectMongoose } = await import('@/lib/mongoose')
  const RefreshToken = (await import('@/lib/models/RefreshToken')).default

  await connectMongoose()

  const familyId = randomUUID()
  const accessToken = await signXeuyToken(payload)
  const refreshToken = await signXeuyRefreshToken({
    ...payload,
    familyId,
  })

  await RefreshToken.create({
    userId: payload.userId,
    tokenHash: hashToken(refreshToken),
    familyId,
    deviceId: payload.deviceId,
    role: payload.role,
    phone: payload.phone,
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: 60 * 60,
  }
}

export async function verifyXeuyToken(token: string): Promise<XeuySession> {
  const { payload } = await jwtVerify(token, getJwtSecretKey())

  if (payload.domain !== XEUY_DOMAIN) {
    throw new Error('Token non-Xeuy')
  }

  if (payload.typ === REFRESH_TYPE) {
    throw new Error('Refresh token ne peut pas être utilisé comme access token')
  }

  const userId = String(payload.userId || '')
  const role = String(payload.role || '').toUpperCase() as XeuyRole
  const phone = String(payload.phone || '')
  const name = String(payload.name || '')

  if (!userId || !role || !phone) {
    throw new Error('Token Xeuy invalide')
  }

  if (role !== 'CLIENT' && role !== 'PROVIDER') {
    throw new Error('Rôle Xeuy invalide')
  }

  return { userId, role, phone, name, domain: XEUY_DOMAIN }
}

/**
 * Verify a refresh token, check it's valid in DB, rotate it (revoke old, issue new),
 * and detect token theft (if a revoked token is reused, revoke the entire family).
 */
export async function rotateXeuyRefreshToken(refreshToken: string): Promise<XeuyTokenPair> {
  const { connectMongoose } = await import('@/lib/mongoose')
  const RefreshToken = (await import('@/lib/models/RefreshToken')).default
  const User = (await import('@/lib/models/User')).default

  await connectMongoose()

  const { payload } = await jwtVerify(refreshToken, getJwtSecretKey())

  if (payload.domain !== XEUY_DOMAIN) {
    throw new Error('Token non-Xeuy')
  }
  if (payload.typ !== REFRESH_TYPE) {
    throw new Error('Access token ne peut pas être utilisé comme refresh token')
  }

  const userId = String(payload.userId || '')
  const role = String(payload.role || '').toUpperCase() as XeuyRole
  const phone = String(payload.phone || '')
  const name = String(payload.name || '')
  const deviceId = String(payload.deviceId || '')
  const familyId = String(payload.familyId || '')

  if (!userId || !role || !phone || !deviceId || !familyId) {
    throw new Error('Refresh token Xeuy invalide')
  }
  if (role !== 'CLIENT' && role !== 'PROVIDER') {
    throw new Error('Rôle Xeuy invalide')
  }

  const user = await User.findById(userId).lean() as any
  if (!user || !user.isActive) {
    throw new Error('Compte désactivé ou introuvable')
  }

  const tokenHash = hashToken(refreshToken)
  const dbToken = await RefreshToken.findOne({ tokenHash })

  if (!dbToken) {
    throw new Error('Refresh token inconnu')
  }

  if (dbToken.revokedAt) {
    console.warn(`[SECURITY] Reuse of revoked refresh token for user ${userId} — revoking family ${familyId}`)
    await RefreshToken.updateMany(
      { familyId },
      { $set: { revokedAt: new Date(), revokedReason: 'token_reuse_detected' } }
    )
    throw new Error('Refresh token révoqué (détection de réutilisation)')
  }

  if (dbToken.deviceId !== deviceId) {
    throw new Error('Device mismatch')
  }

  const newAccessToken = await signXeuyToken({ userId, role, phone, name, deviceId })
  const newRefreshToken = await signXeuyRefreshToken({ userId, role, phone, name, deviceId, familyId })
  const newHash = hashToken(newRefreshToken)

  await RefreshToken.updateOne(
    { _id: dbToken._id },
    { $set: { revokedAt: new Date(), revokedReason: 'rotated', replacedBy: newHash } }
  )
  await RefreshToken.create({
    userId,
    tokenHash: newHash,
    familyId,
    deviceId,
    role,
    phone,
  })

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 60 * 60,
  }
}

/**
 * Revoke all refresh tokens for a user (logout from all devices).
 */
export async function revokeAllXeuyRefreshTokens(userId: string): Promise<void> {
  const { connectMongoose } = await import('@/lib/mongoose')
  const RefreshToken = (await import('@/lib/models/RefreshToken')).default

  await connectMongoose()
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout_all' } }
  )
}

/**
 * Revoke a single refresh token (logout from one device).
 */
export async function revokeXeuyRefreshToken(refreshToken: string): Promise<void> {
  const { connectMongoose } = await import('@/lib/mongoose')
  const RefreshToken = (await import('@/lib/models/RefreshToken')).default

  await connectMongoose()
  const tokenHash = hashToken(refreshToken)
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout' } }
  )
}

export async function verifyXeuyRefreshToken(token: string): Promise<XeuySession> {
  const { payload } = await jwtVerify(token, getJwtSecretKey())

  if (payload.domain !== XEUY_DOMAIN) {
    throw new Error('Token non-Xeuy')
  }

  if (payload.typ !== REFRESH_TYPE) {
    throw new Error('Access token ne peut pas être utilisé comme refresh token')
  }

  const userId = String(payload.userId || '')
  const role = String(payload.role || '').toUpperCase() as XeuyRole
  const phone = String(payload.phone || '')
  const name = String(payload.name || '')

  if (!userId || !role || !phone) {
    throw new Error('Refresh token Xeuy invalide')
  }

  if (role !== 'CLIENT' && role !== 'PROVIDER') {
    throw new Error('Rôle Xeuy invalide')
  }

  return { userId, role, phone, name, domain: XEUY_DOMAIN }
}

export async function requireXeuyAuth(request: NextRequest): Promise<XeuySession> {
  const token = extractXeuyToken(request)
  if (!token) {
    throw new Error('Non authentifié')
  }

  // Dev tokens (backward compat, to be removed in production)
  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev && process.env.DEV_MOBILE_TOKEN && token === process.env.DEV_MOBILE_TOKEN) {
    return { userId: 'dev-mobile-user', role: 'CLIENT', phone: '+221000000000', name: 'Dev Client', domain: XEUY_DOMAIN }
  }
  if (isDev && process.env.DEV_PROVIDER_TOKEN && token === process.env.DEV_PROVIDER_TOKEN) {
    return { userId: 'dev-provider-user', role: 'PROVIDER', phone: '+221000000001', name: 'Dev Provider', domain: XEUY_DOMAIN }
  }

  return verifyXeuyToken(token)
}
