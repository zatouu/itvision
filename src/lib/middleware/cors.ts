import { NextRequest, NextResponse } from 'next/server'

export function getMobileCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  }
}

export function handleCorsPreflight(request: NextRequest, isMobileRoute: boolean): NextResponse | null {
  if (request.method === 'OPTIONS' && isMobileRoute) {
    return new NextResponse(null, { status: 204, headers: getMobileCorsHeaders() })
  }
  return null
}

export function injectCorsHeaders(response: NextResponse, corsHeaders: Record<string, string>): void {
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
}
