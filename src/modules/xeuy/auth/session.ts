/**
 * Xeuy Bi — Authentification OTP découplée du web.
 * - Génère des JWT avec claim `domain: 'xeuy'` pour isolation totale.
 * - Un token Xeuy ne peut pas être utilisé sur les routes web et vice versa.
 * - Access token 7j + Refresh token 30j avec rotation.
 */

import { jwtVerify, SignJWT } from 'jose'
import { getJwtSecretKey } from '@/lib/jwt-secret'
import type { NextRequest } from 'next/server'
import type { XeuyRole, XeuySession } from '../types'

const XEUY_DOMAIN = 'xeuy' as const
const ACCESS_TOKEN_TTL = '7d'
const REFRESH_TOKEN_TTL = '30d'
const REFRESH_TYPE = 'xeuy-refresh' as const

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
}): Promise<string> {
  return new SignJWT({ ...payload, domain: XEUY_DOMAIN, typ: REFRESH_TYPE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getJwtSecretKey())
}

export async function signXeuyTokenPair(payload: {
  userId: string
  role: XeuyRole
  phone: string
  name: string
}): Promise<XeuyTokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    signXeuyToken(payload),
    signXeuyRefreshToken(payload),
  ])
  return {
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,
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
