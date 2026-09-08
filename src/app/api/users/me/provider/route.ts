import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'

/**
 * POST /api/users/me/provider — « Devenir prestataire ».
 * Crée un ProviderProfile pour l'utilisateur courant s'il n'en a pas.
 * La capacité prestataire = présence du profil (jamais un rôle global).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    await connectMongoose()

    const user = await User.findById(userId).lean() as any
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    if (user.providerProfileId) {
      return NextResponse.json({ success: true, providerProfileId: String(user.providerProfileId), existing: true })
    }

    const profile = await ProviderProfile.create({
      userId: user._id,
      kycVerified: user.kycVerified || false,
      serviceCategories: [],
      secondaryCategories: [],
      zone: { city: user.city || '', region: '', radiusKm: 10, departments: [], regions: [] },
      preferences: {},
      currentLoad: 0,
      providerStats: {
        completedMissions: 0,
        cancelledByProvider: 0,
        cancelledByClient: 0,
        reliabilityScore: 100,
      },
    })

    await User.updateOne({ _id: user._id }, { $set: { providerProfileId: profile._id } })

    return NextResponse.json({ success: true, providerProfileId: String(profile._id) })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/users/me/provider]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
