import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { sendPushToAllProviders } from '@/lib/push'
import { getActiveCategorySlugs } from '@/lib/service-categories'

const MAX_DESCRIPTION_LENGTH = 2000
const MAX_BUDGET = 10_000_000
const REQUEST_TTL_HOURS = 2 // une demande non assignée expire après 2h

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const mine = searchParams.get('mine')
    const q: any = {}
    if (status) q.status = status
    else q.status = { $ne: 'expired' } // masquer les demandes expirées par défaut
    if (mine === '1') {
      const { userId } = await requireAuth(request)
      q.clientId = userId
    }

    // Auto-expiration paresseuse: marque "expired" toute demande non assignée dont expiresAt est dépassé.
    // On gère aussi les anciennes demandes créées AVANT l'ajout du champ expiresAt (legacy):
    // dans ce cas on se base sur l'âge via createdAt.
    const now = new Date()
    const legacyCutoff = new Date(now.getTime() - REQUEST_TTL_HOURS * 60 * 60 * 1000)
    await ServiceRequest.updateMany(
      {
        status: { $in: ['created', 'pending_offers'] },
        $or: [
          { expiresAt: { $lt: now } },
          // expiresAt null OU absent (legacy) → expirer si la demande est plus vieille que le TTL
          { expiresAt: null, createdAt: { $lt: legacyCutoff } },
        ],
      },
      { $set: { status: 'expired', expiredAt: now } }
    ).catch(() => {})

    const items = await ServiceRequest.find(q).sort({ createdAt: -1 }).limit(100).lean()

    // Enrichir avec offerCount en une seule requête agrégée
    if (items.length > 0) {
      const ids = items.map((i: any) => i._id)
      const counts = await Offer.aggregate([
        { $match: { requestId: { $in: ids } } },
        { $group: { _id: '$requestId', count: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } } } }
      ])
      const countMap = Object.fromEntries(counts.map((c: any) => [String(c._id), { total: c.count, pending: c.pending }]))
      const enriched = items.map((item: any) => {
        const c = countMap[String(item._id)] || { total: 0, pending: 0 }
        return { ...item, offerCount: c.total, pendingOfferCount: c.pending }
      })
      return NextResponse.json({ items: enriched })
    }

    return NextResponse.json({ items })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/services/requests]', e)
    return NextResponse.json({ error: 'Erreur liste demandes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResponse = applyRateLimit(request, serviceWriteRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }
    const { category, description, media, location, budget, channel, attributes } = body as any

    // Validation catégorie
    const validCategories = await getActiveCategorySlugs()
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
    }
    // Validation description
    if (description && (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH)) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_DESCRIPTION_LENGTH} car.)` }, { status: 400 })
    }
    // Validation location
    if (!location?.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return NextResponse.json({ error: 'Coordonnées manquantes ou invalides' }, { status: 400 })
    }
    const [lng, lat] = location.coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number' || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return NextResponse.json({ error: 'Coordonnées hors limites' }, { status: 400 })
    }
    // Validation budget
    const safeBudget = Number.isFinite(Number(budget)) && Number(budget) >= 0 ? Math.min(Number(budget), MAX_BUDGET) : undefined
    // Validation media
    const safeMedia = Array.isArray(media) ? media.filter((m: any) => m && typeof m.url === 'string').slice(0, 10) : []
    // Validation channel
    const safeChannel = ['web', 'mobile', 'callcenter'].includes(channel) ? channel : 'mobile'
    // Validation attributes
    const safeAttributes = attributes && typeof attributes === 'object' && !Array.isArray(attributes)
      ? Object.fromEntries(Object.entries(attributes).filter(([k, v]) => typeof k === 'string' && v !== undefined))
      : {}

    const expiresAt = new Date(Date.now() + REQUEST_TTL_HOURS * 60 * 60 * 1000)
    const created = await ServiceRequest.create({
      clientId: userId, category,
      description: (description || '').slice(0, MAX_DESCRIPTION_LENGTH),
      media: safeMedia, location, budget: safeBudget, channel: safeChannel,
      attributes: safeAttributes,
      expiresAt,
    })

    // Notifier les providers proches via geofencing (fallback: tous si aucune position connue)
    const notifyNearby = (global as any).notifyNearbyProviders
    if (notifyNearby) {
      const [rLng, rLat] = created.location?.coordinates || []
      notifyNearby({
        requestId: String(created._id),
        category: created.category,
        description: created.description,
        location: created.location,
        budget: created.budget,
        createdAt: created.createdAt,
        lng: rLng,
        lat: rLat,
      }, 10) // 10 km radius
    }

    // Push notification à tous les providers
    await sendPushToAllProviders({
      title: '🔔 Nouvelle demande',
      body: `${created.category} — ${(created.description || '').slice(0, 80) || 'Sans description'}`,
      data: { type: 'request:new', requestId: String(created._id) },
      channelId: 'services',
    }, userId)

    return NextResponse.json({ success: true, item: created })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/services/requests]', e)
    return NextResponse.json({ error: 'Erreur création demande' }, { status: 500 })
  }
}
