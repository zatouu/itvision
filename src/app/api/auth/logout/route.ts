import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth-server'

function getPublicOrigin(request: NextRequest): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL
  if (envOrigin) {
    try {
      return new URL(envOrigin).origin
    } catch {
      // ignore invalid env value
    }
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host
  const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '')

  return `${protocol}://${host}`
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier si c'est une requête fetch (JSON attendu) ou un formulaire (redirection attendue)
    const acceptHeader = request.headers.get('accept') || ''
    const isApiRequest = acceptHeader.includes('application/json') ||
                         request.headers.get('content-type')?.includes('application/json')

    if (isApiRequest) {
      // Réponse JSON pour les appels fetch
      const response = NextResponse.json({ success: true })
      return clearAuthCookie(response)
    }

    // Redirection pour les soumissions de formulaire ou accès direct
    const response = NextResponse.redirect(new URL('/login', getPublicOrigin(request)))
    return clearAuthCookie(response)
  } catch (error) {
    console.error('POST /api/auth/logout error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// Support GET pour les accès directs à l'URL
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.redirect(new URL('/login', getPublicOrigin(request)))
    return clearAuthCookie(response)
  } catch (error) {
    console.error('GET /api/auth/logout error', error)
    return NextResponse.redirect(new URL('/login', 'https://itvisionplus.sn'))
  }
}
