import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import { keycloakEnabled, verifyKeycloakToken, mapKeycloakRolesToAppRole } from '@/lib/keycloak'
import { getJwtSecretKey } from '@/lib/jwt-secret'
import type { NextRequest } from 'next/server'

export type JwtUser = {
  userId: string
  role: string
  email?: string
  username?: string
  marketplaceTier?: 'standard' | 'pro' | 'reseller' | 'partner'
  companyClientId?: string
  userCategory?: 'MARKETPLACE_CLIENT' | 'ENTERPRISE_CLIENT' | 'PLATFORM_USER'
}

export function extractAuthToken(request: NextRequest): string | null {
  return (
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  )
}

export async function verifyAuthToken(token: string): Promise<JwtUser> {
  // Dev mobile tokens statiques — acceptés uniquement en développement
  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev && process.env.DEV_MOBILE_TOKEN && token === process.env.DEV_MOBILE_TOKEN) {
    return { userId: 'dev-mobile-user', role: 'CLIENT', email: 'dev@mobile' }
  }
  if (isDev && process.env.DEV_PROVIDER_TOKEN && token === process.env.DEV_PROVIDER_TOKEN) {
    return { userId: 'dev-provider-user', role: 'PROVIDER', email: 'dev@provider' }
  }

  if (keycloakEnabled()) {
    const kc = await verifyKeycloakToken(token)
    const role = mapKeycloakRolesToAppRole(kc.roles)
    const userId = kc.sub
    if (!userId || !role) throw new Error('Token invalide')
    return {
      userId,
      role,
      email: kc.email,
      username: kc.name
    }
  }
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
    username: typeof payload.username === 'string' ? payload.username : undefined,
    marketplaceTier: (payload as any).marketplaceTier || 'standard',
    companyClientId: typeof (payload as any).companyClientId === 'string' ? (payload as any).companyClientId : undefined,
    userCategory: typeof (payload as any).userCategory === 'string' ? (payload as any).userCategory : undefined
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
