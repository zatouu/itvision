import { NextRequest, NextResponse } from 'next/server'

function clearAuthCookie(response: NextResponse) {
  response.cookies.set('auth-token', '', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0 
  })
  return response
}

export async function POST(request: NextRequest) {
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
  const response = NextResponse.redirect(new URL('/login', request.url))
  return clearAuthCookie(response)
}

// Support GET pour les accès directs à l'URL
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  return clearAuthCookie(response)
}
