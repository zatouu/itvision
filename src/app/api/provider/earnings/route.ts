import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { requireAuth } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const providerObjectId = new mongoose.Types.ObjectId(userId)

    const now = new Date()
    const startOf7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOf30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const completedRequests = await ServiceRequest.find({
      assignedProviderId: providerObjectId,
      status: 'completed',
      selectedOfferId: { $exists: true, $ne: null },
    }).select('selectedOfferId category completedAt createdAt').lean()

    const offerIds = completedRequests.map((r: any) => r.selectedOfferId.toString())
    const offers = await Offer.find({ _id: { $in: offerIds } }).select('price requestId createdAt').lean()
    const offerMap = new Map(offers.map((o: any) => [o._id.toString(), o]))

    const enriched = completedRequests
      .map((req: any) => {
        const offer = offerMap.get(req.selectedOfferId.toString())
        if (!offer || !offer.price) return null
        return {
          requestId: req._id.toString(),
          offerId: offer._id.toString(),
          category: req.category,
          amount: offer.price,
          completedAt: req.completedAt ? new Date(req.completedAt) : null,
          createdAt: req.createdAt ? new Date(req.createdAt) : null,
        }
      })
      .filter(Boolean) as any[]

    const total = enriched.reduce((sum, e) => sum + e.amount, 0)
    const count = enriched.length

    const last7 = enriched.filter((e) => e.completedAt && e.completedAt >= startOf7)
    const last30 = enriched.filter((e) => e.completedAt && e.completedAt >= startOf30)
    const total7 = last7.reduce((sum, e) => sum + e.amount, 0)
    const total30 = last30.reduce((sum, e) => sum + e.amount, 0)

    const daily: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      daily[key] = 0
    }
    last7.forEach((e) => {
      if (!e.completedAt) return
      const key = e.completedAt.toISOString().split('T')[0]
      if (daily[key] !== undefined) daily[key] += e.amount
    })
    const chart = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }))

    const byCategory: Record<string, number> = {}
    enriched.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    })

    const latest = enriched
      .filter((e) => e.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      total,
      count,
      last7Days: total7,
      last30Days: total30,
      chart,
      byCategory,
      latest,
    })
  } catch (err: any) {
    const isAuth = err?.message === 'Non authentifié' || err?.message === 'Token invalide'
    return NextResponse.json(
      { success: false, error: err.message },
      { status: isAuth ? 401 : 500 }
    )
  }
}
