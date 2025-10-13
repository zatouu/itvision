import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { token, password } = await request.json()
    if (!token || !password) return NextResponse.json({ error: 'Paramètres requis' }, { status: 400 })

    const user = await User.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } })
    if (!user) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })

    const passwordHash = await bcrypt.hash(password, 12)
    await User.updateOne({ _id: user._id }, {
      $set: { passwordHash },
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
