/**
 * ProviderPresenceService (IO)
 *
 * Construit la liste des ProviderCandidate autour d'un point, en résolvant la
 * position effective de chaque prestataire :
 *   1. GPS récent (Redis GEO / présence in-memory partagée via global.geo)
 *   2. Dernière position connue / ville du profil (ProviderProfile.zone.coordinates)
 *   3. Sinon : exclu (on ne notifie JAMAIS tout le pays à l'aveugle)
 *
 * Enrichit ensuite chaque candidat avec les données d'éligibilité et de ranking
 * (KYC, catégories, charge, note moyenne) et son tier d'abonnement (monétisation).
 */

import { IVisibilityConfig } from '../models/AppConfig'
import ProviderProfile from '../models/ProviderProfile'
import ProviderSubscription from '../models/ProviderSubscription'
import ServiceReview from '../models/ServiceReview'
import User from '../models/User'
import { connectMongoose } from '../mongoose'
import { resolveTier } from './config'
import { GeoPoint, PresenceStatus, ProviderCandidate } from './types'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface RawPresence {
  providerId: string
  position: GeoPoint
  distanceKm: number
  status: PresenceStatus
  source: 'gps' | 'last_known' | 'profile_city'
  name?: string
}

/** Récupère les prestataires avec GPS récent via la présence partagée (global.geo). */
async function getGpsPresence(center: GeoPoint, radiusKm: number): Promise<RawPresence[]> {
  let geo = (global as any).geo
  if (!geo || typeof geo.findNearbyProviders !== 'function') {
    try {
      // @ts-ignore
      geo = require('@/../lib/redis-geo')
      if (geo && typeof geo.findNearbyProviders === 'function') {
        console.log('[Visibility] getGpsPresence: loaded redis-geo.js directly')
      } else {
        console.warn('[Visibility] getGpsPresence: global.geo not available and redis-geo.js export invalid')
        return []
      }
    } catch (e: any) {
      console.warn('[Visibility] getGpsPresence: global.geo not available, redis-geo.js load failed:', e?.message)
      return []
    }
  }
  try {
    let nearby = await geo.findNearbyProviders(center.lat, center.lng, radiusKm)

    // Fallback sur la Map serveur synchronisée en direct (évite la race geo.updateProviderPosition)
    if ((!nearby || nearby.length === 0) && (global as any).providerPresence) {
      const now = Date.now()
      const fallbackGps: any[] = []
      const PRESENCE_STALE_MS = 10 * 60 * 1000
      for (const [providerId, pos] of (global as any).providerPresence.entries()) {
        if (typeof pos?.lat !== 'number' || typeof pos?.lng !== 'number') continue
        if (now - (pos?.updatedAt || 0) > PRESENCE_STALE_MS) continue
        const dist = haversineKm(center.lat, center.lng, pos.lat, pos.lng)
        if (dist <= radiusKm) {
          fallbackGps.push({
            providerId: String(providerId),
            lat: Number(pos.lat),
            lng: Number(pos.lng),
            dist,
            status: pos.status || 'available',
            name: pos.name || '',
            email: pos.email || '',
          })
        }
      }
      if (fallbackGps.length) nearby = fallbackGps
    }

    console.log(`[Visibility] getGpsPresence lat=${center.lat.toFixed(5)} lng=${center.lng.toFixed(5)} r=${radiusKm}km → ${(nearby || []).length} GPS provider(s)`)
    return (nearby || []).map((p: any) => ({
      providerId: String(p.providerId),
      position: { lat: Number(p.lat), lng: Number(p.lng) },
      distanceKm: Number(p.dist),
      status: (p.status as PresenceStatus) || 'available',
      source: 'gps' as const,
      name: p.name || undefined,
    }))
  } catch (err: any) {
    console.warn('[Visibility] getGpsPresence failed:', err?.message)
    return []
  }
}

/** Fallback : dernière position connue / ville du profil via ProviderProfile.zone.coordinates. */
async function getProfileFallback(
  center: GeoPoint,
  radiusKm: number,
  excludeIds: Set<string>,
  config: IVisibilityConfig,
): Promise<RawPresence[]> {
  if (!config.fallback.useLastKnownPosition && !config.fallback.useProfileCity) return []
  try {
    const docs = await ProviderProfile.find({
      'zone.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [center.lng, center.lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    }).select('userId zone').limit(config.maxProvidersPerWave * 4).lean() as any[]

    const out: RawPresence[] = []
    for (const d of docs) {
      const uid = String(d.userId)
      if (excludeIds.has(uid)) continue
      const coords = d.zone?.coordinates
      if (!Array.isArray(coords) || coords.length !== 2) continue
      const [lng, lat] = coords
      out.push({
        providerId: uid,
        position: { lat: Number(lat), lng: Number(lng) },
        distanceKm: haversineKm(center.lat, center.lng, Number(lat), Number(lng)),
        status: 'offline',
        source: 'last_known',
      })
    }
    console.log(`[Visibility] getProfileFallback r=${radiusKm}km → ${out.length} provider(s)`)
    return out
  } catch (err: any) {
    console.warn('[Visibility] getProfileFallback failed:', err?.message)
    return []
  }
}

/** Moyenne des notes par prestataire (rateeId) pour un ensemble d'IDs. */
async function getRatingAverages(providerIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!providerIds.length) return map
  try {
    const rows = await ServiceReview.aggregate([
      { $match: { providerId: { $in: providerIds } } },
      { $group: { _id: '$providerId', avg: { $avg: '$rating' } } },
    ])
    for (const r of rows) map.set(String(r._id), Number(r.avg))
  } catch (err: any) {
    console.warn('[Visibility] getRatingAverages failed:', err?.message)
  }
  return map
}

function toObjectId(id: string): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Types } = require('mongoose')
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null
  } catch {
    return null
  }
}

/**
 * Construit les candidats autour de la mission jusqu'à radiusKm.
 * `radiusKm` doit être le rayon MAX d'escalade (le moteur découpe ensuite par vagues).
 */
export async function getCandidates(
  center: GeoPoint,
  radiusKm: number,
  config: IVisibilityConfig,
): Promise<ProviderCandidate[]> {
  await connectMongoose()

  const gps = await getGpsPresence(center, radiusKm)

  // Persister la dernière position GPS comme fallback "last_known" pour le futur
  const zoneUpdates = gps
    .map(p => {
      const oid = toObjectId(p.providerId)
      if (!oid) return null
      return {
        updateOne: {
          filter: { userId: oid },
          update: { $set: { 'zone.coordinates': [p.position.lng, p.position.lat], 'zone.updatedAt': new Date() } },
          upsert: true,
        },
      }
    })
    .filter(Boolean) as any[]
  if (zoneUpdates.length) {
    ProviderProfile.bulkWrite(zoneUpdates).catch(() => {})
  }

  const gpsIds = new Set(gps.map(p => p.providerId))
  const fallback = await getProfileFallback(center, radiusKm, gpsIds, config)

  const raw: RawPresence[] = [...gps, ...fallback].filter(p => p.distanceKm <= radiusKm)
  const providerIds = Array.from(new Set(raw.map(p => p.providerId)))
  if (!providerIds.length) return []

  const oids = providerIds.map(toObjectId).filter(Boolean)

  const [profiles, users, subs, ratings] = await Promise.all([
    ProviderProfile.find({ userId: { $in: oids } })
      .select('userId kycVerified serviceCategories currentLoad maxConcurrentMissions')
      .lean() as any,
    User.find({ _id: { $in: oids } }).select('name kycVerified providerStats').lean() as any,
    ProviderSubscription.find({ userId: { $in: oids }, status: 'active' })
      .select('userId tier visibilityRadiusKm priorityLevel boostMultiplier').lean() as any,
    getRatingAverages(providerIds),
  ])

  const profileByUser = new Map<string, any>((profiles as any[]).map(p => [String(p.userId), p]))
  const userById = new Map<string, any>((users as any[]).map(u => [String(u._id), u]))
  const subByUser = new Map<string, any>((subs as any[]).map(s => [String(s.userId), s]))

  const freeTier = resolveTier(config, 'free')

  const candidates: ProviderCandidate[] = []
  for (const p of raw) {
    // dédup : garder la meilleure source (gps prioritaire) si doublon
    if (candidates.some(c => c.providerId === p.providerId)) continue

    const profile = profileByUser.get(p.providerId)
    const user = userById.get(p.providerId)
    const sub = subByUser.get(p.providerId)

    const kycVerified = Boolean(profile?.kycVerified ?? user?.kycVerified ?? false)
    const categories: string[] = profile?.serviceCategories || []
    const secondaryCategories: string[] = profile?.secondaryCategories || []
    const availabilityStatus = profile?.availabilityStatus || 'Disponible'
    const visible = profile?.visible !== false
    const available = visible && availabilityStatus === 'Disponible'
    const tierDef = sub ? { radiusKm: sub.visibilityRadiusKm, priorityLevel: sub.priorityLevel, boostMultiplier: sub.boostMultiplier, id: sub.tier } : freeTier

    candidates.push({
      providerId: p.providerId,
      name: p.name || user?.name,
      position: p.position,
      positionSource: p.source,
      positionAgeSec: null,
      distanceKm: Number(p.distanceKm.toFixed(3)),
      kycVerified,
      categories,
      secondaryCategories,
      availabilityStatus,
      available,
      presenceStatus: available ? p.status : 'offline',
      currentLoad: profile?.currentLoad ?? 0,
      maxConcurrentMissions: profile?.maxConcurrentMissions ?? null,
      ratingAvg: ratings.get(p.providerId) ?? null,
      avgResponseSec: null,
      tier: tierDef.id || 'free',
      visibilityRadiusKm: tierDef.radiusKm ?? config.defaultRadiusKm,
      priorityLevel: tierDef.priorityLevel ?? 0,
      boostMultiplier: tierDef.boostMultiplier ?? 1,
    })
  }

  console.log(`[Visibility] getCandidates gps=${gps.length} fallback=${fallback.length} total=${candidates.length}`)
  return candidates
}
