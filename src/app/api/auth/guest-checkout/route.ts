import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'
import { signAuthTokenWithExpiry } from '@/lib/jwt'
import { setAuthCookie } from '@/lib/auth-server'
import { createUserProfiles } from '@/lib/user-profiles'
import { normalizePhone } from '@/lib/sms'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { name, phone, email } = await request.json()
    const normalizedPhone = normalizePhone(phone)

    if (!name || !normalizedPhone) {
      return NextResponse.json({ error: 'Nom et téléphone requis' }, { status: 400 })
    }

    await connectMongoose()

    // 1. Chercher un utilisateur existant par email ou téléphone
    let user: any = null
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).lean()
    }
    if (!user && normalizedPhone) {
      user = await User.findOne({ phone: normalizedPhone }).lean()
    }

    // 2. Si pas trouvé, créer un compte tacite CLIENT
    if (!user) {
      const safeEmail = email && email.includes('@')
        ? email.toLowerCase().trim()
        : `guest-${normalizedPhone.replace(/\D/g, '')}@guest.itvisionplus.sn`
      const username = `guest-${normalizedPhone.replace(/\D/g, '')}-${crypto.randomBytes(3).toString('hex')}`
      const randomPassword = crypto.randomBytes(16).toString('hex')
      const passwordHash = await bcrypt.hash(randomPassword, 10)

      const newUser = await User.create({
        username,
        email: safeEmail,
        passwordHash,
        name: name.trim(),
        phone: normalizedPhone,
        role: 'CLIENT',
        isActive: true,
        loginAttempts: 0,
      })

      await createUserProfiles(newUser._id, 'CLIENT').catch(err => {
        console.error('[guest-checkout] Erreur création profils:', err)
      })

      user = newUser.toObject()
    }

    // 3. Générer le JWT et poser le cookie
    const token = await signAuthTokenWithExpiry(
      {
        userId: String(user._id),
        email: user.email,
        role: user.role,
        username: user.username,
        name: user.name,
        phone: user.phone,
        marketplaceTier: user.marketplaceTier || 'standard',
      },
      '30d'
    )

    const response = NextResponse.json({
      success: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isNew: user.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < 60_000,
      },
    })

    setAuthCookie(response, token)
    return response
  } catch (e) {
    console.error('[guest-checkout] Erreur:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
