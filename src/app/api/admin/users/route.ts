import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (String(decoded.role || '').toUpperCase() !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    const role = searchParams.get('role') || ''
    const isActive = searchParams.get('isActive')

    const query: any = {}
    if (q) {
      query.$or = [
        { username: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') }
      ]
    }
    if (role) query.role = role.toUpperCase()
    if (isActive === 'true') query.isActive = true
    if (isActive === 'false') query.isActive = false

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query)
    ])

    return NextResponse.json({ success: true, users, total, skip, limit })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)
    const body = await request.json()

    const { username, email, password, name, phone, role, avatarUrl } = body
    if (!username || !email || !password || !name || !role) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const exists = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] }).lean()
    if (exists) return NextResponse.json({ error: 'Utilisateur déjà existant' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const created = await User.create({ username, email: email.toLowerCase(), passwordHash, name, phone, avatarUrl, role: role.toUpperCase() })

    return NextResponse.json({ success: true, user: { id: String(created._id), username, email: created.email, name, phone, avatarUrl: created.avatarUrl, role: created.role } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)
    const body = await request.json()

    const { id, name, phone, role, isActive, avatarUrl } = body
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await User.updateOne({ _id: id }, { $set: { name, phone, avatarUrl, role: role?.toUpperCase(), isActive } })
    const updated = await User.findById(id).lean()
    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)
    const body = await request.json()

    const { id, action, newPassword } = body
    if (!id || !action) return NextResponse.json({ error: 'ID et action requis' }, { status: 400 })

    if (action === 'reset_password') {
      if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 400 })
      const passwordHash = await bcrypt.hash(newPassword, 12)
      await User.updateOne({ _id: id }, { $set: { passwordHash, loginAttempts: 0, lockedUntil: undefined } })
    } else if (action === 'lock') {
      await User.updateOne({ _id: id }, { $set: { lockedUntil: new Date(Date.now() + 60 * 60 * 1000) } })
    } else if (action === 'unlock') {
      await User.updateOne({ _id: id }, { $set: { lockedUntil: undefined, loginAttempts: 0 } })
    } else if (action === 'deactivate') {
      await User.updateOne({ _id: id }, { $set: { isActive: false } })
    } else if (action === 'activate') {
      await User.updateOne({ _id: id }, { $set: { isActive: true } })
    } else if (action === 'enable_2fa') {
      await User.updateOne({ _id: id }, { $set: { twoFactorEnabled: true }, $unset: { twoFactorCode: 1, twoFactorExpires: 1 } })
    } else if (action === 'disable_2fa') {
      await User.updateOne({ _id: id }, { $set: { twoFactorEnabled: false }, $unset: { twoFactorCode: 1, twoFactorExpires: 1 } })
    } else {
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }

    const updated = await User.findById(id).lean()
    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
