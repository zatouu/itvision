import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'

function generateToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return NextResponse.json({ success: true }) // pas de fuite d'info

    const token = generateToken()
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1h

    await User.updateOne({ _id: user._id }, {
      $set: {
        passwordResetToken: token,
        passwordResetExpires: expires
      }
    })

    // TODO: envoyer email via un provider (placeholder)
    console.log(`[RESET] Lien de réinitialisation: /reset-password?token=${token}`)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
