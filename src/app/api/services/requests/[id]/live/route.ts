import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import { haversineKm, minutesEta } from '@/lib/geo'

const DEFAULT_SPEED_KMH = 25 // vitesse moyenne estimée pour ETA en ville
const PRESENCE_STALE_MS = 10 * 60 * 1000

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

function computeDistanceEta(provider: PresenceEntry, requestLat: number, requestLng: number) {
  const loc = toLatLng(provider)
  if (!loc) return { distanceKm: null, etaMinutes: null }
  const distanceKm = haversineKm(loc.lat, loc.lng, requestLat, requestLng)
  const etaMinutes = minutesEta(distanceKm, DEFAULT_SPEED_KMH)
  return { distanceKm: Math.round(distanceKm * 10) / 10, etaMinutes }
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

    // Providers ayant envoyé une offre
    const offers = await Offer.find({ requestId: id, status: { $in: ['submitted', 'accepted'] } }).lean()
    const offerProviderIds = offers.map((o: any) => String(o.providerId))

    // Assigned provider profile
    let assigned: any = null
    if (sr.assignedProviderId) {
      const provider = await User.findById(sr.assignedProviderId).select('name phone').lean()
      const p = presenceMap.get(String(sr.assignedProviderId))
      const loc = p ? toLatLng(p) : null
      const { distanceKm, etaMinutes } = p ? computeDistanceEta(p, reqLat, reqLng) : { distanceKm: null, etaMinutes: null }
      assigned = {
        providerId: String(sr.assignedProviderId),
        name: (provider as any)?.name || p?.name || 'Prestataire',
        status: sr.status === 'provider_arriving' ? 'arriving' : sr.status === 'in_progress' ? 'in_progress' : 'selected',
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        distanceKm,
        etaMinutes,
        lastSeenAt: p?.updatedAt ? new Date(p.updatedAt).toISOString() : null,
        stale: p ? now - (p.updatedAt || 0) > PRESENCE_STALE_MS : true,
      }
    }

    // Providers ayant envoyé une offre
    const offerors = []
    for (const offer of offers as any[]) {
      if (String(offer.providerId) === String(sr.assignedProviderId)) continue
      const p = presenceMap.get(String(offer.providerId))
      const { distanceKm, etaMinutes } = p ? computeDistanceEta(p, reqLat, reqLng) : { distanceKm: null, etaMinutes: null }
      const provider = await User.findById(offer.providerId).select('name').lean().catch(() => null)
      offerors.push({
        providerId: String(offer.providerId),
        name: (provider as any)?.name || p?.name || 'Prestataire',
        status: 'offered',
        price: offer.price,
        etaMinutes: offer.etaMinutes ?? etaMinutes,
        lat: p ? toLatLng(p)?.lat ?? null : null,
        lng: p ? toLatLng(p)?.lng ?? null : null,
        distanceKm,
        offerId: String(offer._id),
        lastSeenAt: p?.updatedAt ? new Date(p.updatedAt).toISOString() : null,
        stale: p ? now - (p.updatedAt || 0) > PRESENCE_STALE_MS : true,
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

    // Providers proches disponibles (pour suggestion "il y a X providers autour")
    const nearby = []
    for (const [pid, p] of presenceMap.entries()) {
      if (pid === String(sr.assignedProviderId)) continue
      if (offerProviderIds.includes(pid)) continue
      if (p.viewingRequestId === id) continue
      if (isStale(p)) continue
      const loc = toLatLng(p)
      if (!loc) continue
      const distanceKm = haversineKm(loc.lat, loc.lng, reqLat, reqLng)
      if (distanceKm <= 10) {
        nearby.push({
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
    nearby.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))

    function isStale(p: PresenceEntry) {
      return Date.now() - (p.updatedAt || 0) > PRESENCE_STALE_MS
    }

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

