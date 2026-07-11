import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const user = await User.findById(userId).lean() as any
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    // Self-healing: si le nom est en fait un numéro de téléphone (ancien bug), on le vide
    let userName = user.name || ''
    if (userName && /^\d{7,}$/.test(userName)) {
      userName = ''
      await User.updateOne({ _id: user._id }, { $set: { name: '' } })
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: String(user._id),
        name: userName,
        phone: user.phone || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        role: user.role || '',
        referralCode: user.referralCode || '',
        referralBalance: user.referralBalance || 0,
        referralCount: user.referralCount || 0,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/users/me]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const allowed = ['name', 'avatarUrl', 'phone', 'email', 'company', 'address', 'city', 'country']
    const update: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'name') update[key] = String(body[key]).slice(0, 100)
        else if (key === 'avatarUrl') update[key] = String(body[key]).slice(0, 500)
        else if (key === 'phone') update[key] = String(body[key]).slice(0, 30)
        else if (key === 'email') update[key] = String(body[key]).toLowerCase().slice(0, 200)
        else update[key] = String(body[key]).slice(0, 200)
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).lean() as any
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    return NextResponse.json({
      success: true,
      user: {
        _id: String(user._id),
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        role: user.role || '',
        referralCode: user.referralCode || '',
        referralBalance: user.referralBalance || 0,
        referralCount: user.referralCount || 0,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[PATCH /api/users/me]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
