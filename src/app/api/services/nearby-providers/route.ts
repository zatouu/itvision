import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'
import { haversineKm } from '@/lib/geo'
import { getVisibilityConfig } from '@/lib/visibility/config'

type NearbyProvider = {
  providerId: string
  name: string
  status: string
  lat: number
  lng: number
  distanceKm: number
  etaMinutes: number
  categories?: string[]
}

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
    const radiusKm = Math.min(Number(searchParams.get('radiusKm') || 10), 50)
    const category = searchParams.get('category') || undefined

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat/lng requis' }, { status: 400 })
    }

    const config = await getVisibilityConfig()
    const freshnessMs = (config.presenceFreshnessSec || 600) * 1000

    let raw: any[] = []
    let source = 'global.geo'

    // 1) Redis GEO via global.geo quand server.js est actif
    let geo = (global as any).geo
    if (!geo || typeof geo.findNearbyProviders !== 'function') {
      try {
        // @ts-ignore
        const geoMod = require('@/../lib/redis-geo')
        if (geoMod && typeof geoMod.findNearbyProviders === 'function') {
          geo = geoMod
          source = 'redis-geo.js'
        }
      } catch (e: any) {
        console.warn('[nearby-providers] redis-geo.js load failed:', e?.message)
      }
    }

    if (geo && typeof geo.findNearbyProviders === 'function') {
      try {
        raw = await geo.findNearbyProviders(lat, lng, radiusKm)
      } catch (err: any) {
        console.warn('[nearby-providers] geo.findNearbyProviders failed:', err.message)
      }
    }

    const now = Date.now()
    let candidates = raw.filter((p: any) => {
      if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) return false
      if (p.status === 'offline') return false
      if (now - Number(p.updatedAt || 0) > freshnessMs) return false
      return true
    })

    // 2) Fallback last-known MongoDB si redis geo n'a rien
    if (candidates.length === 0) {
      try {
        const docs = await ProviderProfile.find({
          'zone.coordinates': {
            $near: {
              $geometry: { type: 'Point', coordinates: [lng, lat] },
              $maxDistance: radiusKm * 1000,
            },
          },
        }).select('userId zone serviceCategories').limit(50).lean() as any[]

        candidates = docs.map((d: any) => {
          const [pLng, pLat] = d.zone?.coordinates || [0, 0]
          return {
            providerId: String(d.userId),
            lat: Number(pLat),
            lng: Number(pLng),
            distanceKm: haversineKm(lat, lng, Number(pLat), Number(pLng)),
            status: 'available',
            updatedAt: d.zone?.updatedAt?.getTime() || now,
            categories: d.serviceCategories || [],
          }
        })
        source = 'profile.zone'
      } catch (e: any) {
        console.warn('[nearby-providers] ProviderProfile fallback failed:', e.message)
      }
    }

    const userIds = candidates.map((p) => String(p.providerId))
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id name kycVerified').lean()
      : []
    const userMap = new Map(users.map((u: any) => [String(u._id), u]))

    const profileIds = userIds.length
      ? await ProviderProfile.find({ userId: { $in: userIds } }).select('userId serviceCategories').lean()
      : []
    const profileMap = new Map(profileIds.map((p: any) => [String(p.userId), p]))

    const result: NearbyProvider[] = candidates
      .map((p: any) => {
        const id = String(p.providerId)
        const user = userMap.get(id)
        const profile = profileMap.get(id)
        const distanceKm = Number(p.distanceKm) || haversineKm(lat, lng, Number(p.lat), Number(p.lng))
        const etaMinutes = Math.max(5, Math.round((distanceKm / 25) * 60 / 5) * 5)

        if (category) {
          const cats = profile?.serviceCategories || []
          const match = cats.length === 0 || cats.includes(category)
          if (!match) return null
        }

        return {
          providerId: id,
          name: user?.name || p.name || 'Prestataire',
          status: p.status || 'available',
          lat: Number(p.lat),
          lng: Number(p.lng),
          distanceKm: Math.round(distanceKm * 10) / 10,
          etaMinutes,
          categories: profile?.serviceCategories || [],
        }
      })
      .filter(Boolean) as NearbyProvider[]

    result.sort((a, b) => a.distanceKm - b.distanceKm)

    return NextResponse.json({
      success: true,
      count: result.length,
      radiusKm,
      source,
      providers: result.slice(0, 50),
    })
  } catch (err: any) {
    console.error('[GET /api/services/nearby-providers]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
