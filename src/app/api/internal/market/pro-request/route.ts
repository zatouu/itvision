import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { isInternalCall } from '@/lib/internal-auth'
import User from '@/lib/models/User'
import InAppNotification from '@/lib/models/InAppNotification'
import { syncUserToProfiles } from '@/lib/user-profiles'

export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/market/pro-request { userId, reason } → { status }
 * Demande de tarif pro DDM+ pour un prestataire Xeuy dont l'éligibilité est vérifiée côté Xeuy
 * (identité vérifiée ou missions réalisées). La validation reste manuelle (/admin/marketplace/comptes-pro).
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 200) : 'Prestataire Xeuy'
  if (!mongoose.Types.ObjectId.isValid(userId)) return NextResponse.json({ error: 'userId invalide' }, { status: 400 })

  try {
    await connectMongoose()
    const user = await User.findById(userId).select('name email phone marketplaceTier proRequestedAt').lean() as any
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    if ((user.marketplaceTier || 'standard') !== 'standard') return NextResponse.json({ status: 'pro' })
    if (user.proRequestedAt) return NextResponse.json({ status: 'requested' })

    const res = await User.updateOne(
      { _id: userId, proRequestedAt: { $in: [null] } },
      { $set: { proRequestedAt: new Date() } }
    )
    if (res.modifiedCount === 1) {
      await syncUserToProfiles(userId)
      await InAppNotification.create({
        roles: ['ADMIN', 'SUPER_ADMIN'],
        type: 'info',
        title: 'Nouvelle demande Pro (prestataire Xeuy)',
        message: `${user.name || user.phone || user.email} demande le tarif pro DDM+ : ${reason}.`,
        actionUrl: '/admin/marketplace/comptes-pro',
        metadata: { userId, requestType: 'pro_upgrade', source: 'xeuy' },
      }).catch(() => {})
    }
    return NextResponse.json({ status: 'requested' })
  } catch (err) {
    console.error('[POST /api/internal/market/pro-request]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
