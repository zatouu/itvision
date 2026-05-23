import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'

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

    const geoFilter: any = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [q.lng, q.lat] },
          $maxDistance: (q.radiusKm || 5) * 1000
        }
      }
    }

    const statusFilter = { status: { $in: ['created', 'pending_offers'] } }
    const catFilter = q.category ? { category: q.category } : {}
    const mineFilter = q.excludeMine ? { clientId: { $ne: userId } } : {}

    const items = await ServiceRequest.find({ ...geoFilter, ...statusFilter, ...catFilter, ...mineFilter })
      .select({ clientId: 1, category: 1, description: 1, location: 1, budget: 1, status: 1, createdAt: 1 })
      .limit(50)
      .lean()

    const withScore = items.map((it: any) => {
      const [lng, lat] = (it.location?.coordinates || [q.lng, q.lat])
      const distMeters = haversineMeters(q.lat, q.lng, lat, lng)
      return { ...it, _score: score(distMeters, it.createdAt), _distance: Math.round(distMeters) }
    })

    return NextResponse.json({ items: withScore })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur matching' }, { status: 500 })
  }
}
