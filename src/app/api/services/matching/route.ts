import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import { APPROXIMATION_MAX_METERS, approximateCoordinates, publicArea } from '@/lib/request-privacy'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import MissionUnlock from '@/lib/models/MissionUnlock'
import ProviderProfile from '@/lib/models/ProviderProfile'
import { requireAuth } from '@/lib/jwt'
import { computeUnlockCost } from '@/lib/credit-cost'
import { getVisibilityConfig } from '@/lib/visibility'

const REQUEST_TTL_HOURS = 2 // doit rester aligné avec /api/services/requests

type NearQuery = {
  lng: number
  lat: number
  radiusKm?: number
  category?: string
  excludeMine?: boolean
}

function parseNearQuery(req: NextRequest): NearQuery | null {
  const sp = new URL(req.url).searchParams
  const lng = Number(sp.get('lng'))
  const lat = Number(sp.get('lat'))
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  let radiusKm = Number(sp.get('radiusKm') || 5)
  if (!Number.isFinite(radiusKm)) radiusKm = 5
  radiusKm = Math.min(Math.max(radiusKm, 0.5), 25)
  const category = sp.get('category') || undefined
  const excludeMine = (sp.get('excludeMine') || 'true').toLowerCase() === 'true'
  return { lng, lat, radiusKm, category, excludeMine }
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function score(distanceMeters: number, createdAt: Date): number {
  const distScore = 1 / (1 + distanceMeters / 1000)
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3_600_000)
  const recency = 1 / (1 + ageHours)
  return Number((distScore * 0.6 + recency * 0.4).toFixed(6))
}

const MATCHING_RATE_LIMITS = [
  { windowMs: 60_000, max: 40, keyPrefix: 'xeuy:matching:min' },
  { windowMs: 3_600_000, max: 600, keyPrefix: 'xeuy:matching:hour' },
]

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    // Limite par compte (pas par IP : les opérateurs mobiles partagent les IP). Usage normal de l'app :
    // quelques appels par minute ; au-delà, c'est un balayage de la carte pour localiser des clients.
    for (const rule of MATCHING_RATE_LIMITS) {
      const limit = await rateLimitRequest(request, { ...rule, identifier: String(userId) })
      if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)
    }

    const q = parseNearQuery(request)
    if (!q) return NextResponse.json({ error: 'Paramètres géo invalides' }, { status: 400 })

    console.log(`[MATCHING] user=${userId} radius=${q.radiusKm}km excludeMine=${q.excludeMine}`)

    const radiusMeters = (q.radiusKm || 5) * 1000
    // Recherche élargie de la marge de floutage : l'appartenance au rayon est ensuite décidée sur la
    // position floutée, ce qui empêche de retrouver la vraie position en sondant la limite du rayon.
    const geoFilter: any = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [q.lng, q.lat] },
          $maxDistance: radiusMeters + APPROXIMATION_MAX_METERS
        }
      }
    }

    const now = new Date()
    const legacyCutoff = new Date(now.getTime() - REQUEST_TTL_HOURS * 60 * 60 * 1000)

    const statusFilter = { status: { $in: ['created', 'pending_offers'] } }
    // Une demande legacy (sans expiresAt) n'est valide que si elle est plus récente que le TTL
    const expiryFilter = { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null, createdAt: { $gte: legacyCutoff } }] }
    let catFilter: Record<string, unknown> = q.category ? { category: q.category } : {}
    let scopeCategories: string[] = []

    // Portée de navigation pilotée par l'admin (visibility.browseScope) :
    // 'category' = le prestataire ne voit que les demandes de ses métiers (catégories principales + secondaires)
    if (!q.category) {
      const config = await getVisibilityConfig()
      if (config.browseScope === 'category') {
        const profile = await ProviderProfile.findOne({ userId })
          .select('serviceCategories secondaryCategories')
          .lean() as any
        scopeCategories = [
          ...(profile?.serviceCategories || []),
          ...(profile?.secondaryCategories || []),
        ].filter(Boolean)
        if (scopeCategories.length > 0) {
          catFilter = { category: { $in: scopeCategories } }
        }
      }
    }
    const mineFilter = q.excludeMine ? { clientId: { $ne: userId } } : {}

    const totalCount = await ServiceRequest.countDocuments({ ...statusFilter, ...expiryFilter, ...catFilter })
    console.log(`[MATCHING] total requests in DB (status created/pending): ${totalCount}`)

    const items = await ServiceRequest.find({ ...geoFilter, ...statusFilter, ...expiryFilter, ...catFilter, ...mineFilter })
      .select({ clientId: 1, category: 1, subCategory: 1, title: 1, description: 1, location: 1, address: 1, budget: 1, media: 1, status: 1, createdAt: 1, urgent: 1, scheduledFor: 1 })
      .limit(50)
      .lean()

    console.log(`[MATCHING] found ${items.length} items after geo+status+mine filter`)

    const requestIds = items.map((it: any) => String(it._id))

    const myUnlocks = await MissionUnlock.find({
      requestId: { $in: requestIds },
      providerId: userId,
      status: { $in: ['active', 'reserved', 'spent'] },
    }).select('requestId status').lean()
    const unlockedSet = new Set(myUnlocks.map((u: any) => String(u.requestId)))

    const myOffers = await Offer.find({
      requestId: { $in: requestIds },
      providerId: userId,
      status: { $in: ['submitted', 'expired'] },
    }).select('requestId price etaMinutes comment validityMinutes validUntil createdAt updatedAt status').lean()
    const myOfferMap = new Map(myOffers.map((o: any) => [String(o.requestId), o]))

    const withScore = await Promise.all(items.map(async (it: any) => {
      const [lng, lat] = (it.location?.coordinates || [q.lng, q.lat])
      const distMeters = haversineMeters(q.lat, q.lng, lat, lng)
      const distKm = distMeters / 1000
      const cost = await computeUnlockCost({
        requestId: String(it._id),
        category: it.category,
        budget: it.budget,
        urgency: it.attributes?.urgency || 'normal',
        media: it.media,
        distanceKm: distKm,
      })
      const hasAudio = (it.media || []).some((m: any) => m.type === 'audio')
      const hasPhoto = (it.media || []).some((m: any) => m.type === 'image')
      const hasVideo = (it.media || []).some((m: any) => m.type === 'video')
      const myOffer = myOfferMap.get(String(it._id)) || null
      // Seule une position approximative sort d'ici ; distance et score affichés en dérivent aussi
      // (une distance exacte permettrait de retrouver l'adresse par triangulation).
      const hasCoords = it.location?.coordinates?.length === 2
      const [approxLng, approxLat] = hasCoords ? approximateCoordinates(String(it._id), lng, lat) : [lng, lat]
      const shownDistance = haversineMeters(q.lat, q.lng, approxLat, approxLng)
      // Adresse réduite au quartier : le repère précis (immeuble, porte…) n'est donné qu'au prestataire retenu
      const area = publicArea(it.location?.address || it.address)
      // Hors du rayon une fois floutée : on l'écarte (l'appartenance ne dépend pas de la vraie position)
      if (hasCoords && shownDistance > radiusMeters) return null
      const location = hasCoords
        ? { type: 'Point', coordinates: [approxLng, approxLat], address: area || undefined, approximate: true }
        : { address: area || undefined }
      return {
        ...it,
        address: area,
        location,
        _score: score(shownDistance, it.createdAt),
        _distance: Math.round(shownDistance / 100) * 100,
        _unlockCost: cost.cost,
        _unlockedByMe: unlockedSet.has(String(it._id)),
        _hasOffered: !!myOffer,
        _myOffer: myOffer,
        _hasAudio: hasAudio,
        _hasPhoto: hasPhoto,
        _hasVideo: hasVideo,
      }
    }))

    return NextResponse.json({
      items: withScore.filter(Boolean),
      browseScope: (q.category || scopeCategories.length > 0) ? 'category' : 'all',
      scopeCategories,
    })
  } catch (e: any) {
    console.error('MATCHING ERROR:', e)
    return NextResponse.json({ error: 'Erreur matching: ' + (e?.message || String(e)) }, { status: 500 })
  }
}
