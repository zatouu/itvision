import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import Payment from '@/lib/models/Payment'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const activeStatuses = ['assigned', 'provider_arriving', 'in_progress']
    const [activeMissions, pendingOffers, dailyRevenueAgg] = await Promise.all([
      ServiceRequest.countDocuments({ assignedProviderId: userId, status: { $in: activeStatuses } }),
      Offer.countDocuments({ providerId: userId, status: 'submitted' }),
      Payment.aggregate([
        {
          $match: {
            providerId: userId,
            status: 'released',
            releasedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ])

    const dailyRevenue = dailyRevenueAgg[0]?.total || 0

    return NextResponse.json({
      success: true,
      activeMissions,
      pendingOffers,
      dailyRevenue,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/services/provider-dashboard]', e)
    return NextResponse.json({ error: 'Erreur tableau de bord' }, { status: 500 })
  }
}
