import { NextRequest } from 'next/server'

/**
 * Authentification des appels serveur-à-serveur (/api/internal/*).
 * Réutilise CRON_SECRET — même modèle de confiance que les routes cron :
 * l'appelant est le backend lui-même, jamais un client.
 * Fail-closed : si le secret n'est pas configuré, tout appel est refusé.
 */
export function isInternalCall(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret') || ''
  const expected = process.env.CRON_SECRET || ''
  if (!expected) {
    console.warn('[INTERNAL API] CRON_SECRET non configuré — appel refusé')
    return false
  }
  return secret === expected
}

function resolveBaseUrl(request?: NextRequest): string {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (request) {
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || ''
    if (host) return `${proto}://${host}`
  }
  return 'http://localhost:3000'
}

/**
 * POST interne vers /api/internal/* (interactions inter-domaines — cf. AGENTS.md).
 * Retourne le JSON parsé, ou null si l'appel échoue / n'est pas autorisé.
 */
export async function internalPost<T = any>(
  request: NextRequest,
  path: string,
  body: unknown
): Promise<T | null> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn('[INTERNAL API] CRON_SECRET non configuré — appel interne impossible')
    return null
  }
  try {
    const res = await fetch(`${resolveBaseUrl(request)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': secret },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (err) {
    console.error('[INTERNAL API] échec appel', path, err)
    return null
  }
}
