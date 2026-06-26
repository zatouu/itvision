import { NextResponse } from 'next/server'

export function applySecurityHeaders(response: NextResponse, pathname: string): void {
  const scriptSrc =
    process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

  const connectSrc =
    process.env.NODE_ENV === 'production'
      ? "connect-src 'self' https: wss:"
      : "connect-src 'self' http: https: ws: wss:"

  const securityHeaders: Record<string, string> = {
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      connectSrc,
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    'X-Application': 'IT-Vision-Plus',
    'X-Version': '1.0.0',
  }

  if (process.env.NODE_ENV === 'production') {
    securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  const sensitivePatterns = [
    '/admin',
    '/login',
    '/register',
    '/market/creer-compte',
    '/market/compte',
    '/client-portal',
    '/tech-interface',
    '/compte',
    '/panier',
  ]

  if (sensitivePatterns.some((pattern) => pathname.includes(pattern))) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
}

export function applyApiSecurityHeaders(response: NextResponse): void {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
}
