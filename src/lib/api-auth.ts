import { NextRequest } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'

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
