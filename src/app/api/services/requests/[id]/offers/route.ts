import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import ServiceReview from '@/lib/models/ServiceReview'
import { requireAuth } from '@/lib/jwt'
import User from '@/lib/models/User'

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
    const offers = await Offer.find({ requestId: id }).sort({ price: 1 }).lean()

    // Enrichir chaque offre avec la note moyenne du provider
    const providerIds = [...new Set(offers.map((o: any) => String(o.providerId)))]
    const ratings = await ServiceReview.aggregate([
      { $match: { providerId: { $in: providerIds } } },
      { $group: { _id: '$providerId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ])
    const ratingsMap = new Map(ratings.map((r: any) => [r._id, { avg: Math.round(r.avg * 10) / 10, count: r.count }]))

    // Fetch KYC verified status + reliability stats for providers
    const users = await User.find({ _id: { $in: providerIds } })
      .select('kycVerified providerStats')
      .lean()
    const userMap = new Map(users.map((u: any) => [String(u._id), u]))

    const enriched = offers.map((o: any) => {
      const u: any = userMap.get(String(o.providerId)) || {}
      const stats = u.providerStats || {}
      return {
        ...o,
        providerRating: ratingsMap.get(String(o.providerId)) || null,
        providerVerified: !!u.kycVerified,
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
