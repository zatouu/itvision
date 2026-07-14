import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import VisibilityDispatch from '@/lib/models/VisibilityDispatch'
import ScheduledTask from '@/lib/models/ScheduledTask'
import { getVisibilityConfig } from '@/lib/visibility'
import { getCandidates } from '@/lib/visibility/presence'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: NextRequest) {
  // Autoriser un token debug via env pour investigation à distance
  const { searchParams } = new URL(request.url)
  const debugToken = searchParams.get('token')
  const admin = await requireAdminApi(request)
  if (!admin.ok && debugToken !== process.env.VISIBILITY_DEBUG_TOKEN) {
    return NextResponse.json({ success: false, error: admin.error || 'Accès refusé' }, { status: admin.status || 401 })
  }

  try {
    await connectMongoose()
    const requestId = searchParams.get('requestId')
    const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined
    const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined
    const radiusKm = Number(searchParams.get('radiusKm')) || 10

    let center: { lat: number; lng: number } | undefined
    let serviceRequest: any = null
    if (requestId) {
      serviceRequest = await ServiceRequest.findById(requestId).lean()
      if (serviceRequest?.location?.coordinates) {
        const [cLng, cLat] = serviceRequest.location.coordinates
        center = { lat: Number(cLat), lng: Number(cLng) }
      }
    }
    if (lat !== undefined && lng !== undefined) {
      center = { lat, lng }
    }

    const [dispatch, tasks, config] = await Promise.all([
      requestId ? VisibilityDispatch.findOne({ requestId: new mongoose.Types.ObjectId(requestId) }).lean() : null,
      requestId ? ScheduledTask.find({ requestId: new mongoose.Types.ObjectId(requestId) }).sort({ runAt: 1 }).lean() : [],
      getVisibilityConfig(true),
    ])

    const geo = (global as any).geo
    const providerPresence = (global as any).providerPresence
    const now = Date.now()
    const STALE_MS = 10 * 60 * 1000

    let geoNearby: any[] = []
    let presenceNearby: any[] = []
    let candidates: any[] = []

    if (center) {
      if (geo && typeof geo.findNearbyProviders === 'function') {
        geoNearby = (await geo.findNearbyProviders(center.lat, center.lng, radiusKm)) || []
      }

      if (providerPresence && typeof providerPresence.entries === 'function') {
        for (const [id, pos] of providerPresence.entries()) {
          if (typeof pos?.lat !== 'number' || typeof pos?.lng !== 'number') continue
          if (now - (pos?.updatedAt || 0) > STALE_MS) continue
          const dist = haversineKm(center.lat, center.lng, pos.lat, pos.lng)
          if (dist <= radiusKm) {
            presenceNearby.push({
              providerId: String(id),
              lat: pos.lat,
              lng: pos.lng,
              dist: Number(dist.toFixed(3)),
              status: pos.status || 'available',
              updatedAt: pos.updatedAt,
            })
          }
        }
      }

      candidates = await getCandidates(center, radiusKm, config)
    }

    return NextResponse.json({
      success: true,
      requestId,
      center,
      radiusKm,
      serviceRequest: serviceRequest
        ? {
            _id: serviceRequest._id,
            clientId: serviceRequest.clientId,
            category: serviceRequest.category,
            status: serviceRequest.status,
            location: serviceRequest.location,
            createdAt: serviceRequest.createdAt,
          }
        : null,
      dispatch,
      scheduledTasks: tasks,
      config,
      presence: {
        geoProviderCount: geo && typeof geo.getProviderCount === 'function' ? await geo.getProviderCount() : null,
        providerPresenceTotal: providerPresence?.size ?? null,
        geoNearbyCount: geoNearby.length,
        presenceNearbyCount: presenceNearby.length,
        candidatesCount: candidates.length,
        geoNearby: geoNearby.slice(0, 50),
        presenceNearby: presenceNearby.slice(0, 50),
        candidates: candidates.map(c => ({
          providerId: c.providerId,
          name: c.name,
          distanceKm: c.distanceKm,
          presenceStatus: c.presenceStatus,
          categories: c.categories,
          kycVerified: c.kycVerified,
          tier: c.tier,
          positionSource: c.positionSource,
        })),
      },
    })
  } catch (error: any) {
    console.error('[GET /api/admin/visibility-debug]', error)
    return NextResponse.json({ success: false, error: error?.message || 'Erreur' }, { status: 500 })
  }
}
