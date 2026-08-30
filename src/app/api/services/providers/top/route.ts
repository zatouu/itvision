import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceReadRateLimiter } from '@/lib/rate-limiter'
import Offer from '@/lib/models/Offer'
import ServiceReview from '@/lib/models/ServiceReview'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
  const rl = await applyRateLimit(request, serviceReadRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 5), 20)

    // Providers avec le plus d'offres acceptées
    const acceptedCounts = await Offer.aggregate([
      { $match: { status: 'accepted' } },
      { $group: { _id: '$providerId', acceptedCount: { $sum: 1 } } },
      { $sort: { acceptedCount: -1 } },
      { $limit: limit * 2 },
    ])

    const providerIds = acceptedCounts.map((c: any) => c._id)

    // Notes moyennes
    const ratings = await ServiceReview.aggregate([
      { $match: { providerId: { $in: providerIds } } },
      { $group: { _id: '$providerId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])

    const users = await User.find({ _id: { $in: providerIds } }).lean()

    const result = acceptedCounts.map((c: any) => {
      const user = users.find((u: any) => String(u._id) === String(c._id))
      const r = ratings.find((r: any) => String(r._id) === String(c._id))
      return {
        id: String(c._id),
        name: user?.name || user?.phone || 'Prestataire',
        rating: r ? { avg: Number(r.avg.toFixed(1)), count: r.count } : { avg: 0, count: 0 },
        completedMissions: c.acceptedCount,
      }
    }).slice(0, limit)

    return NextResponse.json({ providers: result })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/services/providers/top]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
