import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'
import { haversineKm } from '@/lib/geo'
import { getVisibilityConfig } from '@/lib/visibility/config'

const URGENT_MAX_ETA_DEFAULT = 30
const URGENT_RADIUS_KM_DEFAULT = 15
const AVERAGE_SPEED_KMH = 25

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const maxEta = Math.min(Math.max(Number(searchParams.get('maxEta') || URGENT_MAX_ETA_DEFAULT), 5), 120)
    const radiusKm = Math.min(Math.max(Number(searchParams.get('radiusKm') || URGENT_RADIUS_KM_DEFAULT), 1), 50)
    const category = searchParams.get('category') || undefined

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat/lng requis' }, { status: 400 })
    }

    const config = await getVisibilityConfig()
    const freshnessMs = (config.presenceFreshnessSec || 600) * 1000
    const now = Date.now()

    // 1) Redis GEO quand disponible (positions live les plus fraîches)
    let raw: any[] = []
    let geo = (global as any).geo
    if (!geo || typeof geo.findNearbyProviders !== 'function') {
      try {
        // @ts-ignore
        const geoMod = require('@/../lib/redis-geo')
        if (geoMod && typeof geoMod.findNearbyProviders === 'function') {
          geo = geoMod
        }
      } catch (e: any) {
        // ignore
      }
    }

    if (geo && typeof geo.findNearbyProviders === 'function') {
      try {
        raw = await geo.findNearbyProviders(lat, lng, radiusKm)
      } catch (err: any) {
        console.warn('[urgent-eligibility] geo.findNearbyProviders failed:', err.message)
      }
    }

    // 2) Fallback MongoDB sur les zones déclarées des profils + présence serveur
    if (raw.length === 0) {
      try {
        const presenceMap = (global as any).providerPresence as Map<string, any> | undefined
        const docs = await ProviderProfile.find({
          kycVerified: true,
          zone: {
            $near: {
              $geometry: { type: 'Point', coordinates: [lng, lat] },
              $maxDistance: radiusKm * 1000,
            },
          },
          $expr: {
            $lt: ['$currentLoad', { $ifNull: ['$maxConcurrentMissions', 1] }],
          },
        })
          .select('userId zone serviceCategories currentLoad maxConcurrentMissions kycVerified')
          .limit(50)
          .lean() as any[]

        raw = docs
          .filter((d: any) => {
            const pid = String(d.userId)
            const p = presenceMap?.get(pid)
            if (!p) return false
            if (p.status === 'offline' || p.status === 'on_mission') return false
            if (now - (p.updatedAt || 0) > freshnessMs) return false
            return true
          })
          .map((d: any) => {
            const p = presenceMap!.get(String(d.userId))!
            const [pLng, pLat] = d.zone?.coordinates || [0, 0]
            const useLat = Number.isFinite(Number(p.lat)) ? Number(p.lat) : Number(pLat)
            const useLng = Number.isFinite(Number(p.lng)) ? Number(p.lng) : Number(pLng)
            return {
              providerId: String(d.userId),
              lat: useLat,
              lng: useLng,
              status: p.status || 'available',
              updatedAt: p.updatedAt || now,
              categories: d.serviceCategories || [],
              currentLoad: d.currentLoad || 0,
              maxConcurrentMissions: d.maxConcurrentMissions || 1,
            }
          })
      } catch (e: any) {
        console.warn('[urgent-eligibility] ProviderProfile fallback failed:', e.message)
      }
    }

    const userIds = raw.map((p: any) => String(p.providerId))
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id name kycVerified').lean()
      : []
    const userMap = new Map(users.map((u: any) => [String(u._id), u]))

    const profileIds = userIds.length
      ? await ProviderProfile.find({ userId: { $in: userIds } })
          .select('userId serviceCategories currentLoad maxConcurrentMissions kycVerified')
          .lean()
      : []
    const profileMap = new Map(profileIds.map((p: any) => [String(p.userId), p]))

    const eligibleProviders = raw
      .map((p: any) => {
        const id = String(p.providerId)
        const user = userMap.get(id)
        const profile = profileMap.get(id)

        const distanceKm = Number(p.distanceKm) || haversineKm(lat, lng, Number(p.lat), Number(p.lng))
        const etaMinutes = Math.max(5, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60 / 5) * 5)

        if (etaMinutes > maxEta) return null

        // Disponibilité et confiance
        const currentLoad = Number(p.currentLoad ?? profile?.currentLoad ?? 0)
        const maxLoad = Number(p.maxConcurrentMissions ?? profile?.maxConcurrentMissions ?? 1)
        const kycVerified = user?.kycVerified ?? profile?.kycVerified ?? false
        if (!kycVerified) return null
        if (currentLoad >= maxLoad) return null

        const categories = profile?.serviceCategories || p.categories || []
        if (category && !categories.includes(category)) return null

        return {
          providerId: id,
          name: user?.name || p.name || 'Prestataire',
          distanceKm: Math.round(distanceKm * 10) / 10,
          etaMinutes,
          categories,
        }
      })
      .filter(Boolean) as any[]

    eligibleProviders.sort((a, b) => a.etaMinutes - b.etaMinutes)

    const bestEta = eligibleProviders[0]?.etaMinutes ?? null

    return NextResponse.json({
      eligible: eligibleProviders.length > 0,
      count: eligibleProviders.length,
      bestEta,
      radiusKm,
      maxEta,
    })
  } catch (err: any) {
    console.error('[GET /api/services/urgent-eligibility]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
