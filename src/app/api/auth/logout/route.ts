import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  // Supprimer le cookie de session en définissant une valeur vide et maxAge: 0
  response.cookies.set('auth-token', '', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0 
  })
  return response
}
