import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import ProviderProfile from '@/lib/models/ProviderProfile'
import { requireAuth } from '@/lib/jwt'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params
    const sr = await ServiceRequest.findById(id)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (String(sr.clientId) !== String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    const offers = await Offer.find({ requestId: id }).sort({ updatedAt: -1 }).lean()

    // Enrichir chaque offre avec les stats précalculées du provider
    const providerIds = [...new Set(offers.map((o: any) => String(o.providerId)))]
    const profiles = await ProviderProfile.find({ userId: { $in: providerIds } })
      .select('userId kycVerified providerStats performance')
      .lean()
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]))

    const enriched = offers.map((o: any) => {
      const p: any = profileMap.get(String(o.providerId)) || {}
      const stats = p.providerStats || {}
      const perf = p.performance || {}
      const rating = perf.ratingAvg && perf.ratingCount ? { avg: perf.ratingAvg, count: perf.ratingCount } : null
      return {
        ...o,
        providerRating: rating,
        providerVerified: !!p.kycVerified,
        providerReliability: {
          score: typeof stats.reliabilityScore === 'number' ? stats.reliabilityScore : 100,
          completed: stats.completedMissions || 0,
          cancelled: stats.cancelledByProvider || 0,
        },
      }
    })

    return NextResponse.json({ offers: enriched, request: sr })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/requests/:id/offers]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
