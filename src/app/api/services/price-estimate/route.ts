import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { applyRateLimit, serviceReadRateLimiter } from '@/lib/rate-limiter'

/**
 * GET /api/services/price-estimate?category=electricite&lng=-17.44&lat=14.69
 *
 * Returns median, p25, p75 prices based on accepted offers
 * in the same category within 5km radius.
 * Falls back to city-wide stats if not enough local data.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, serviceReadRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = request.nextUrl
  const category = searchParams.get('category')
  const lng = parseFloat(searchParams.get('lng') || '')
  const lat = parseFloat(searchParams.get('lat') || '')

  if (!category) {
    return NextResponse.json({ error: 'category requis' }, { status: 400 })
  }

  await connectMongoose()

  const hasGeo = !isNaN(lng) && !isNaN(lat)
  const RADIUS_KM = 5
  const MIN_SAMPLES = 3

  // Find completed requests in category (optionally near location)
  const matchStage: any = {
    category,
    status: 'completed',
  }

  if (hasGeo) {
    matchStage.location = {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: RADIUS_KM * 1000,
      },
    }
  }

  // Get request IDs
  let requests = await ServiceRequest.find(matchStage)
    .select('_id selectedOfferId')
    .limit(200)
    .lean()

  // If not enough local data and we had geo filter, retry without geo
  if (requests.length < MIN_SAMPLES && hasGeo) {
    delete matchStage.location
    requests = await ServiceRequest.find(matchStage)
      .select('_id selectedOfferId')
      .sort({ completedAt: -1 })
      .limit(200)
      .lean()
  }

  if (requests.length === 0) {
    return NextResponse.json({ estimate: null, samples: 0, message: 'Pas assez de données' })
  }

  // Get accepted offer prices
  const offerIds = requests
    .map((r: any) => r.selectedOfferId)
    .filter(Boolean)

  let prices: number[] = []

  if (offerIds.length > 0) {
    const offers = await Offer.find({ _id: { $in: offerIds } })
      .select('price')
      .lean()
    prices = offers.map((o: any) => o.price).filter((p: number) => p > 0)
  }

  // Fallback: if no selectedOfferId, use all accepted offers for those requests
  if (prices.length < MIN_SAMPLES) {
    const requestIds = requests.map((r: any) => r._id)
    const offers = await Offer.find({
      requestId: { $in: requestIds },
      status: 'accepted',
    })
      .select('price')
      .lean()
    prices = offers.map((o: any) => o.price).filter((p: number) => p > 0)
  }

  if (prices.length === 0) {
    return NextResponse.json({ estimate: null, samples: 0, message: 'Pas assez de données' })
  }

  // Calculate percentiles
  prices.sort((a, b) => a - b)
  const median = percentile(prices, 50)
  const p25 = percentile(prices, 25)
  const p75 = percentile(prices, 75)

  return NextResponse.json({
    estimate: {
      median: Math.round(median),
      low: Math.round(p25),
      high: Math.round(p75),
      currency: 'FCFA',
    },
    samples: prices.length,
    local: hasGeo && requests.length >= MIN_SAMPLES,
  })
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}
