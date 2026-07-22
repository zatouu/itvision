import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import { haversineKm, minutesEta } from '@/lib/geo'
import ProviderProfile from '@/lib/models/ProviderProfile'

const DEFAULT_SPEED_KMH = 25 // vitesse moyenne estimée pour ETA en ville
const PRESENCE_STALE_MS = 10 * 60 * 1000
const DEFAULT_RADIUS_KM = 10

type PresenceEntry = {
  lat?: number
  lng?: number
  updatedAt?: number
  status?: 'available' | 'viewing' | 'on_mission' | 'offline'
  viewingRequestId?: string | null
  missionRequestId?: string | null
  name?: string
  email?: string
}

function toLatLng(p: any) {
  const lat = Number(p?.lat)
  const lng = Number(p?.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

function computeDistanceEtaFromLatLng(lat: number, lng: number, requestLat: number, requestLng: number) {
  const distanceKm = haversineKm(lat, lng, requestLat, requestLng)
  const etaMinutes = minutesEta(distanceKm, DEFAULT_SPEED_KMH)
  return { distanceKm: Math.round(distanceKm * 10) / 10, etaMinutes }
}

function computeDistanceEta(provider: PresenceEntry, requestLat: number, requestLng: number) {
  const loc = toLatLng(provider)
  if (!loc) return { distanceKm: null, etaMinutes: null }
  return computeDistanceEtaFromLatLng(loc.lat, loc.lng, requestLat, requestLng)
}

async function resolveProviderLocation(
  providerId: string,
  requestLat: number,
  requestLng: number,
  profileByUserId?: Map<string, any>
) {
  const presenceMap = (global as any).providerPresence as Map<string, PresenceEntry> | undefined
  const p = presenceMap?.get(providerId)
  if (p && !isStale(p) && toLatLng(p)) {
    const loc = toLatLng(p)!
    const { distanceKm, etaMinutes } = computeDistanceEtaFromLatLng(loc.lat, loc.lng, requestLat, requestLng)
    return { lat: loc.lat, lng: loc.lng, name: p.name, distanceKm, etaMinutes, updatedAt: p.updatedAt, source: 'presence' as const }
  }

  // Fallback ProviderProfile.zone (priorise le cache batché si fourni)
  let profile = profileByUserId?.get(providerId) || null
  if (!profile) {
    profile = await ProviderProfile.findOne({ userId: providerId }).select('zone').lean().catch(() => null)
  }
  const coords = profile?.zone?.coordinates
  if (Array.isArray(coords) && coords.length === 2) {
    const [lng, lat] = coords
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const { distanceKm, etaMinutes } = computeDistanceEtaFromLatLng(lat, lng, requestLat, requestLng)
      return { lat, lng, name: undefined, distanceKm, etaMinutes, updatedAt: new Date(profile?.updatedAt || Date.now()).getTime(), source: 'profile.zone' as const }
    }
  }

  return null
}

function isStale(p: PresenceEntry) {
  return Date.now() - (p.updatedAt || 0) > PRESENCE_STALE_MS
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const { id } = await params

    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const isClient = String(sr.clientId) === String(userId)
    const isAssignedProvider = String(sr.assignedProviderId) === String(userId)
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
    if (!isClient && !isAssignedProvider && !isAdmin) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    const [reqLng, reqLat] = sr.location?.coordinates || [0, 0]
    if (!reqLat || !reqLng) {
      return NextResponse.json({ error: 'Position mission inconnue' }, { status: 400 })
    }

    const presenceMap = ((global as any).providerPresence || new Map()) as Map<string, PresenceEntry>
    const now = Date.now()

    // Helper: find nearby providers from redis-geo.js or ProviderProfile.zone as fallback
    async function getNearbyFallback(): Promise<any[]> {
      let geo = (global as any).geo
      if (!geo || typeof geo.findNearbyProviders !== 'function') {
        try {
          // @ts-ignore
          const geoMod = require('@/../lib/redis-geo')
          if (geoMod && typeof geoMod.findNearbyProviders === 'function') geo = geoMod
        } catch (e: any) { /* ignore */ }
      }

      if (geo && typeof geo.findNearbyProviders === 'function') {
        try {
          const raw = await geo.findNearbyProviders(reqLat, reqLng, DEFAULT_RADIUS_KM)
          const fresh = (raw || []).filter((p: any) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && (now - Number(p.updatedAt || 0) <= PRESENCE_STALE_MS))
          if (fresh.length > 0) return fresh
        } catch (e: any) { /* ignore */ }
      }

      try {
        const docs = await ProviderProfile.find({
          'zone.coordinates': {
            $near: {
              $geometry: { type: 'Point', coordinates: [reqLng, reqLat] },
              $maxDistance: DEFAULT_RADIUS_KM * 1000,
            },
          },
        }).select('userId zone').limit(50).lean() as any[]
        return docs.map((d: any) => {
          const [lng, lat] = d.zone?.coordinates || [0, 0]
          return { providerId: String(d.userId), lat: Number(lat), lng: Number(lng), status: 'available', updatedAt: new Date(d.zone?.updatedAt || Date.now()).getTime(), source: 'profile.zone' }
        })
      } catch (e: any) { /* ignore */ }

      return []
    }

    // Providers ayant envoyé une offre
    const offers = await Offer.find({ requestId: id, status: { $in: ['submitted', 'accepted'] } }).lean()
    const offerProviderIds = offers.map((o: any) => String(o.providerId))

    // Pré-chargement groupé des noms et zones pour éviter le N+1
    const providerIdsToEnrich = [...new Set([...(sr.assignedProviderId ? [String(sr.assignedProviderId)] : []), ...offerProviderIds])]
    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: providerIdsToEnrich } }).select('name').lean().catch(() => [] as any[]),
      ProviderProfile.find({ userId: { $in: providerIdsToEnrich } }).select('userId zone').lean().catch(() => [] as any[]),
    ])
    const userNameById = new Map<string, string>()
    for (const u of users) userNameById.set(String(u._id), (u as any).name)
    const profileByUserId = new Map<string, any>()
    for (const p of profiles) profileByUserId.set(String((p as any).userId), p)

    // Assigned provider profile
    let assigned: any = null
    if (sr.assignedProviderId) {
      const pid = String(sr.assignedProviderId)
      const loc = await resolveProviderLocation(pid, reqLat, reqLng, profileByUserId)
      const p = presenceMap.get(pid)
      assigned = {
        providerId: pid,
        name: userNameById.get(pid) || p?.name || loc?.name || 'Prestataire',
        status: sr.status === 'provider_arriving' || sr.status === 'on_the_way' ? 'arriving' : sr.status === 'in_progress' ? 'in_progress' : 'selected',
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        distanceKm: loc?.distanceKm ?? null,
        etaMinutes: loc?.etaMinutes ?? null,
        lastSeenAt: loc ? new Date(loc.updatedAt || now).toISOString() : null,
        stale: loc ? now - (loc.updatedAt || 0) > PRESENCE_STALE_MS : true,
      }
    }

    // Providers ayant envoyé une offre
    const offerors = []
    for (const offer of offers as any[]) {
      const pid = String(offer.providerId)
      if (pid === String(sr.assignedProviderId)) continue
      const p = presenceMap.get(pid)
      const loc = await resolveProviderLocation(pid, reqLat, reqLng, profileByUserId)
      offerors.push({
        providerId: pid,
        name: userNameById.get(pid) || p?.name || loc?.name || 'Prestataire',
        status: 'offered',
        price: offer.price,
        etaMinutes: offer.etaMinutes ?? loc?.etaMinutes ?? null,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        distanceKm: loc?.distanceKm ?? null,
        offerId: String(offer._id),
        lastSeenAt: loc ? new Date(loc.updatedAt || now).toISOString() : null,
        stale: loc ? now - (loc.updatedAt || 0) > PRESENCE_STALE_MS : true,
      })
    }

    // Providers en train de consulter cette demande
    const viewers = []
    for (const [pid, p] of presenceMap.entries()) {
      if (pid === String(sr.assignedProviderId)) continue
      if (!offerProviderIds.includes(pid) && p.viewingRequestId === id && !isStale(p)) {
        const { distanceKm, etaMinutes } = computeDistanceEta(p, reqLat, reqLng)
        viewers.push({
          providerId: pid,
          name: p.name || 'Prestataire',
          status: 'viewing',
          lat: toLatLng(p)?.lat ?? null,
          lng: toLatLng(p)?.lng ?? null,
          distanceKm,
          etaMinutes,
          lastSeenAt: new Date(p.updatedAt || now).toISOString(),
          stale: false,
        })
      }
    }

    // Providers proches disponibles (fallback redis-geo / ProviderProfile.zone)
    const nearbyProviders = new Map<string, any>()
    const fallback = await getNearbyFallback()
    for (const p of fallback) {
      if (p.providerId === String(sr.assignedProviderId)) continue
      if (offerProviderIds.includes(p.providerId)) continue
      if (p.viewingRequestId === id) continue
      const status = p.status === 'on_mission' ? 'busy' : 'available'
      nearbyProviders.set(p.providerId, {
        providerId: p.providerId,
        name: p.name || 'Prestataire',
        status,
        lat: p.lat,
        lng: p.lng,
        distanceKm: Math.round(Number(p.distanceKm) * 10) / 10,
        etaMinutes: p.etaMinutes ?? minutesEta(Number(p.distanceKm), DEFAULT_SPEED_KMH),
        lastSeenAt: new Date(p.updatedAt || now).toISOString(),
      })
    }

    // Overlays from in-memory presence when server.js is active
    for (const [pid, p] of presenceMap.entries()) {
      if (pid === String(sr.assignedProviderId)) continue
      if (offerProviderIds.includes(pid)) continue
      if (isStale(p)) continue
      const loc = toLatLng(p)
      if (!loc) continue
      const distanceKm = haversineKm(loc.lat, loc.lng, reqLat, reqLng)
      if (distanceKm <= 10) {
        nearbyProviders.set(pid, {
          providerId: pid,
          name: p.name || 'Prestataire',
          status: p.status === 'on_mission' ? 'busy' : 'available',
          lat: loc.lat,
          lng: loc.lng,
          distanceKm: Math.round(distanceKm * 10) / 10,
          etaMinutes: minutesEta(distanceKm, DEFAULT_SPEED_KMH),
          lastSeenAt: new Date(p.updatedAt || now).toISOString(),
        })
      }
    }

    const nearby = Array.from(nearbyProviders.values()).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))

    return NextResponse.json({
      requestId: id,
      location: { lat: reqLat, lng: reqLng },
      status: sr.status,
      assigned,
      offerors,
      viewers,
      nearby,
      updatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/requests/:id/live]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

