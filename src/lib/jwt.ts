import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import { getJwtSecretKey } from '@/lib/jwt-secret'
import type { NextRequest } from 'next/server'

export type JwtUser = {
  userId: string
  role: string
  email?: string
  username?: string
}

export function extractAuthToken(request: NextRequest): string | null {
  return (
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  )
}

export async function verifyAuthToken(token: string): Promise<JwtUser> {
  const secret = getJwtSecretKey()
  const { payload } = await jwtVerify(token, secret)

  const role = String(payload.role || '').toUpperCase()
  const userId = String(payload.userId || payload.id || payload.sub || '')

  if (!userId || !role) {
    throw new Error('Token invalide')
  }

  return {
    userId,
    role,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    username: typeof payload.username === 'string' ? payload.username : undefined
  }
}

export async function verifyJwtPayload(token: string): Promise<JWTPayload> {
  const secret = getJwtSecretKey()
  const { payload } = await jwtVerify(token, secret)
  return payload
}

export async function requireAuth(request: NextRequest): Promise<JwtUser> {
  const token = extractAuthToken(request)
  if (!token) {
    throw new Error('Non authentifié')
  }
  return verifyAuthToken(token)
}

export async function signAuthTokenWithExpiry(
  payload: {
    userId: string
    email?: string
    role: string
    username?: string
    [key: string]: unknown
  },
  expiresIn: string
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey())
}
