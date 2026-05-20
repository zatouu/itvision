import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { signAuthTokenWithExpiry } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, code, remember } = await request.json()
    if (!userId || !code) return NextResponse.json({ error: 'Paramètres requis' }, { status: 400 })

    const user = (await User.findById(userId).lean()) as any
    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json({ error: 'MFA non activé' }, { status: 400 })
    }

    if (!user.twoFactorCode || !user.twoFactorExpires || new Date(user.twoFactorExpires) < new Date()) {
      return NextResponse.json({ error: 'Code expiré' }, { status: 400 })
    }

    if (String(user.twoFactorCode) !== String(code)) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    // Clear 2FA code and issue token
    await User.updateOne({ _id: userId }, { $unset: { twoFactorCode: 1, twoFactorExpires: 1 } })

    const token = await signAuthTokenWithExpiry(
      {
        userId: String(user._id),
        email: user.email,
        role: user.role,
        username: user.username
      },
      remember ? '30d' : '7d'
    )

    const userData = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role
    }

    const response = NextResponse.json({ success: true, user: userData, redirectUrl: getRedirectUrl(user.role) })
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: (remember ? 30 : 7) * 24 * 60 * 60
    })

    return response
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function getRedirectUrl(role: string): string {
  const normalized = String(role).toUpperCase()
  switch (normalized) {
    case 'ADMIN':
      return '/admin-reports'
    case 'TECHNICIAN':
      return '/tech-interface'
    case 'CLIENT':
    default:
      return '/compte'
  }
}
