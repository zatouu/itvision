import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'

// Rôles ayant accès à l'administration
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role, userId }) => {
    const normalizedRole = String(role).toUpperCase()
    if (!ADMIN_ROLES.includes(normalizedRole)) throw new Error('Accès non autorisé')
    return {
      role: normalizedRole,
      userId: String(userId || '')
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

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
    await requireAdmin(request)
    const body = await request.json()

    const { username, email, password, name, phone, role, avatarUrl, company, address, city, country, companyClientId } = body
    if (!username || !email || !password || !name || !role) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const exists = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] }).lean()
    if (exists) return NextResponse.json({ error: 'Utilisateur déjà existant' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const created = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      name,
      phone,
      avatarUrl,
      role: role.toUpperCase(),
      company,
      address,
      city,
      country,
      companyClientId
    })

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
    await requireAdmin(request)
    const body = await request.json()

    const { id, name, phone, role, isActive, avatarUrl, company, address, city, country, companyClientId } = body
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await User.updateOne(
      { _id: id },
      { $set: { name, phone, avatarUrl, role: role?.toUpperCase(), isActive, company, address, city, country, companyClientId } }
    )
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
    const admin = await requireAdmin(request)
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
    } else if (action === 'delete') {
      const targetUser = await User.findById(id).lean() as { _id: unknown; role?: string; name?: string } | null
      if (!targetUser) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      }

      if (String(targetUser._id) === admin.userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
      }

      const targetRole = String(targetUser.role || '').toUpperCase()
      if (targetRole === 'SUPER_ADMIN' && admin.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Seul un Super Admin peut supprimer un Super Admin' }, { status: 403 })
      }

      if (ADMIN_ROLES.includes(targetRole)) {
        const remainingAdmins = await User.countDocuments({
          _id: { $ne: id },
          role: { $in: ADMIN_ROLES },
          isActive: true
        })
        if (remainingAdmins === 0) {
          return NextResponse.json({ error: 'Impossible de supprimer le dernier administrateur actif' }, { status: 400 })
        }
      }

      await User.deleteOne({ _id: id })
      return NextResponse.json({ success: true, message: 'Utilisateur supprimé avec succès' })
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
