import { NextRequest, NextResponse } from 'next/server'

// Allowlist optionnelle (origines séparées par des virgules). Si définie, seules
// ces origines navigateur reçoivent un ACAO — les apps natives n'envoient pas
// d'en-tête Origin et ne sont pas soumises à CORS.
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function getMobileCorsHeaders(origin?: string | null): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  }
  if (ALLOWED_ORIGINS.length === 0) {
    return { ...base, 'Access-Control-Allow-Origin': '*' }
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
  }
  // Origine non autorisée (ou absente) : pas d'ACAO — le navigateur bloquera
  return base
}

export function handleCorsPreflight(request: NextRequest, isMobileRoute: boolean): NextResponse | null {
  if (request.method === 'OPTIONS' && isMobileRoute) {
    return new NextResponse(null, { status: 204, headers: getMobileCorsHeaders(request.headers.get('origin')) })
  }
  return null
}

export function injectCorsHeaders(response: NextResponse, corsHeaders: Record<string, string>): void {
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
}
