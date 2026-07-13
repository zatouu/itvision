import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import MissionUnlock from '@/lib/models/MissionUnlock'
import { requireAuth } from '@/lib/jwt'
import { computeUnlockCost } from '@/lib/credit-cost'
import { releaseMissionReservation } from '@/lib/wallet'

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

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const q = parseNearQuery(request)
    if (!q) return NextResponse.json({ error: 'Paramètres géo invalides' }, { status: 400 })

    console.log(`[MATCHING] user=${userId} lng=${q.lng} lat=${q.lat} radius=${q.radiusKm}km excludeMine=${q.excludeMine}`)

    const geoFilter: any = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [q.lng, q.lat] },
          $maxDistance: (q.radiusKm || 5) * 1000
        }
      }
    }

    // Auto-expire les demandes expirées (paresseux), y compris les anciennes sans expiresAt (legacy)
    const now = new Date()
    const legacyCutoff = new Date(now.getTime() - REQUEST_TTL_HOURS * 60 * 60 * 1000)
    const expiringRequests = await ServiceRequest.find({
      status: { $in: ['created', 'pending_offers'] },
      $or: [
        { expiresAt: { $lt: now } },
        { expiresAt: null, createdAt: { $lt: legacyCutoff } },
      ],
    }).select('_id').lean()
    if (expiringRequests.length > 0) {
      const expiringIds = expiringRequests.map((item: any) => item._id)
      await ServiceRequest.updateMany(
        { _id: { $in: expiringIds } },
        { $set: { status: 'expired', expiredAt: now } }
      )
      const reservations = await MissionUnlock.find({
        requestId: { $in: expiringIds },
        status: 'reserved',
      }).select('requestId providerId').lean()
      await Promise.all(reservations.map((reservation: any) =>
        releaseMissionReservation(String(reservation.providerId), String(reservation.requestId), 'Mission expirée').catch(() => {})
      ))
    }

    const statusFilter = { status: { $in: ['created', 'pending_offers'] } }
    // Une demande legacy (sans expiresAt) n'est valide que si elle est plus récente que le TTL
    const expiryFilter = { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null, createdAt: { $gte: legacyCutoff } }] }
    const catFilter = q.category ? { category: q.category } : {}
    const mineFilter = q.excludeMine ? { clientId: { $ne: userId } } : {}

    const totalCount = await ServiceRequest.countDocuments({ ...statusFilter, ...catFilter })
    console.log(`[MATCHING] total requests in DB (status created/pending): ${totalCount}`)

    const items = await ServiceRequest.find({ ...geoFilter, ...statusFilter, ...expiryFilter, ...catFilter, ...mineFilter })
      .select({ clientId: 1, category: 1, subCategory: 1, title: 1, description: 1, location: 1, address: 1, budget: 1, media: 1, status: 1, createdAt: 1 })
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
      return {
        ...it,
        _score: score(distMeters, it.createdAt),
        _distance: Math.round(distMeters),
        _unlockCost: cost.cost,
        _unlockedByMe: unlockedSet.has(String(it._id)),
        _hasAudio: hasAudio,
        _hasPhoto: hasPhoto,
        _hasVideo: hasVideo,
      }
    }))

    return NextResponse.json({ items: withScore })
  } catch (e: any) {
    console.error('MATCHING ERROR:', e)
    return NextResponse.json({ error: 'Erreur matching: ' + (e?.message || String(e)) }, { status: 500 })
  }
}
