import { NextRequest } from 'next/server'
import { csrfProtection } from '@/lib/csrf-protection'
import { getMobileCorsHeaders, handleCorsPreflight } from './cors'
import { isMobileApiRoute } from './routes'

/**
 * Routes recevant des fichiers, EXCLUES du middleware (src/middleware.ts → config.matcher).
 *
 * Next clone le corps de chaque requête qui traverse le middleware. Quand le fichier arrive
 * lentement (réseau mobile), ce clonage casse sa lecture dans la route (« Response body object
 * should not be disturbed or locked » / « corps multipart illisible ») : la demande échouait dès
 * qu'une photo ou un audio était joint. Ces routes réappliquent donc elles-mêmes les protections
 * API du middleware : CSRF, préflight et en-têtes CORS des routes mobiles.
 * (Cache-Control / en-têtes de sécurité : posés par next.config.mjs sur /api/*.)
 */
export const MULTIPART_ROUTES = ['/api/upload', '/api/ai/transcribe'] as const

export async function runMultipartRoute(request: NextRequest, handler: () => Promise<Response>): Promise<Response> {
  const response = csrfProtection.middleware(request) ?? await handler()
  if (isMobileApiRoute(request.nextUrl.pathname)) {
    for (const [key, value] of Object.entries(getMobileCorsHeaders(request.headers.get('origin')))) {
      response.headers.set(key, value)
    }
  }
  return response
}

/** Préflight CORS des routes multipart mobiles (répondu auparavant par le middleware). */
export function multipartPreflight(request: NextRequest): Response {
  return handleCorsPreflight(request, isMobileApiRoute(request.nextUrl.pathname)) ?? new Response(null, { status: 204 })
}
