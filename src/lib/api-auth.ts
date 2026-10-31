import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { requireAuth, type JwtUser } from '@/lib/jwt'
import { logFailedAuth, logSecurityViolation } from '@/lib/security-logger'

export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const

export class ApiAuthError extends Error {
  constructor(message: string, readonly status: 401 | 403) {
    super(message)
    this.name = 'ApiAuthError'
  }
}

/**
 * Vérifie le JWT (cookie `auth-token` ou Bearer, Keycloak si activé) et, si fourni, le rôle.
 * Lève `ApiAuthError` (401/403) — à convertir avec `authErrorResponse()` dans le catch.
 */
export async function requireApiUser(
  request: NextRequest,
  allowedRoles?: readonly string[]
): Promise<JwtUser> {
  let user: JwtUser
  try {
    user = await requireAuth(request)
  } catch (error) {
    logFailedAuth('invalid_or_missing_token', request, { error: error instanceof Error ? error.message : String(error) })
    throw new ApiAuthError('Non authentifié', 401)
  }

  if (allowedRoles && !allowedRoles.some((r) => r.toUpperCase() === user.role)) {
    logSecurityViolation('unauthorized_role_access', request, { userId: user.userId, role: user.role })
    throw new ApiAuthError('Accès non autorisé', 403)
  }
  return user
}

export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return null
}

export type RequireAuthOk = {
  ok: true
  user: {
    id: string
    role: string
    email?: string
    name?: string
  }
}

export type RequireAuthFail = {
  ok: false
  status: number
  error: string
}

export type RequireAuthResult = RequireAuthOk | RequireAuthFail

/** Staff autorisé à gérer le catalogue produits / pricing (miroir de domains.ts `/admin/produits`). */
export const PRODUCT_STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER']

export async function requireAdminApi(
  request: NextRequest,
  allowedRoles: string[] = ['ADMIN', 'SUPER_ADMIN']
): Promise<RequireAuthResult> {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return {
      ok: false,
      status: 401,
      error: auth.error || 'Non authentifié'
    }
  }

  const role = String(auth.user.role || '').toUpperCase()
  const allowed = allowedRoles.map(r => r.toUpperCase())
  if (!allowed.includes(role)) {
    return {
      ok: false,
      status: 403,
      error: 'Accès refusé'
    }
  }

  return { ok: true, user: auth.user }
}
