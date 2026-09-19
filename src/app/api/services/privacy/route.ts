import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { verifyAuthServer } from '@/lib/auth-server'

const DEFAULTS = { profilePublic: true, preciseLocation: true, smsNotifications: false }

// GET /api/services/privacy — préférences de confidentialité du compte
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const user = await User.findById(auth.user.id).select('privacy deletedAt').lean() as any
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    return NextResponse.json({ privacy: { ...DEFAULTS, ...(user.privacy || {}) } })
  } catch (e: any) {
    console.error('[GET /api/services/privacy]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/services/privacy — met à jour un ou plusieurs toggles
export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.user.id
    let body: any
    try { body = await request.json() } catch { body = {} }

    const allowed = ['profilePublic', 'preciseLocation', 'smsNotifications'] as const
    const $set: Record<string, boolean> = {}
    for (const key of allowed) {
      if (typeof body[key] === 'boolean') $set[`privacy.${key}`] = body[key]
    }
    if (Object.keys($set).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 })
    }

    const user = await User.findByIdAndUpdate(userId, { $set }, { new: true }).select('privacy').lean() as any
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    return NextResponse.json({ success: true, privacy: { ...DEFAULTS, ...(user.privacy || {}) } })
  } catch (e: any) {
    console.error('[PATCH /api/services/privacy]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
