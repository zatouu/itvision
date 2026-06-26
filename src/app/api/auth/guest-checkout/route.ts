import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth-server'
import { resolveGuestOrAuthUser } from '@/lib/guest-checkout'

export async function POST(request: NextRequest) {
  try {
    const { name, phone, email } = await request.json()
    const resolved = await resolveGuestOrAuthUser(request, { name, phone, email })

    const response = NextResponse.json({
      success: true,
      user: {
        id: resolved.userId,
        name: resolved.name,
        email: resolved.email,
        phone: resolved.phone,
        role: resolved.role,
        isNew: resolved.isNew,
      },
    })

    if (resolved.token) {
      setAuthCookie(response, resolved.token)
    }

    return response
  } catch (e) {
    console.error('[guest-checkout] Erreur:', e)
    const message = e instanceof Error ? e.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
