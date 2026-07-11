/**
 * Redis GEO module for provider presence and geofencing.
 *
 * Uses Redis GEO commands (GEOADD, GEOSEARCH) for O(log N) spatial queries.
 * Replaces the in-memory Map<userId, {lat,lng,...}> approach.
 *
 * Keys:
 *  - geo:providers         → Redis sorted set (GEO) with providerId as member
 *  - provider:meta:<id>    → Hash with status, name, email, updatedAt, viewingRequestId, missionRequestId
 *
 * Fallback: if Redis is unavailable, falls back to in-memory Map.
 */

const STALE_POSITION_MS = 10 * 60 * 1000

// In-memory fallback
const memPresence = new Map()

let redis = null
let redisConnected = false

function getRedis() {
  if (redis !== null) return redis
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.log('[Redis] REDIS_URL not set, using in-memory fallback')
    return null
  }
  try {
    // Lazy-load ioredis to avoid crash if not installed
    const IORedis = require('ioredis')
    redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: false,
    })
    redis.on('connect', () => {
      redisConnected = true
      console.log('[Redis] Connected for geofencing')
    })
    redis.on('error', (err) => {
      redisConnected = false
      console.warn('[Redis] Error:', err.message)
    })
    redis.on('close', () => {
      redisConnected = false
    })
    return redis
  } catch (err) {
    console.warn('[Redis] ioredis not available, using in-memory fallback:', err.message)
    redis = false // mark as unavailable
    return null
  }
}

function isRedisAvailable() {
  return redis !== false && redisConnected
}

/**
 * Update provider position in Redis GEO + metadata.
 */
async function updateProviderPosition(providerId, { lat, lng, status, name, email, viewingRequestId, missionRequestId }) {
  const now = Date.now()
  const meta = { status: status || 'available', name: name || '', email: email || '', updatedAt: String(now) }
  if (viewingRequestId) meta.viewingRequestId = viewingRequestId
  if (missionRequestId) meta.missionRequestId = missionRequestId

  const r = getRedis()
  if (r && isRedisAvailable()) {
    try {
      const pipeline = r.pipeline()
      pipeline.geoadd('geo:providers', lng, lat, providerId)
      pipeline.hset(`provider:meta:${providerId}`, meta)
      pipeline.expire(`provider:meta:${providerId}`, Math.ceil(STALE_POSITION_MS / 1000))
      await pipeline.exec()
      return
    } catch (err) {
      console.warn('[Redis] updateProviderPosition failed, fallback:', err.message)
    }
  }
  // In-memory fallback
  const existing = memPresence.get(providerId) || {}
  memPresence.set(providerId, { ...existing, lat, lng, ...meta, updatedAt: now })
}

/**
 * Update provider metadata only (no position change).
 */
async function updateProviderMeta(providerId, patch) {
  const now = Date.now()
  const r = getRedis()
  if (r && isRedisAvailable()) {
    try {
      const key = `provider:meta:${providerId}`
      const meta = { ...patch, updatedAt: String(now) }
      await r.hset(key, meta)
      await r.expire(key, Math.ceil(STALE_POSITION_MS / 1000))
      return
    } catch (err) {
      console.warn('[Redis] updateProviderMeta failed, fallback:', err.message)
    }
  }
  const existing = memPresence.get(providerId) || {}
  memPresence.set(providerId, { ...existing, ...patch, updatedAt: now })
}

/**
 * Find providers within radiusKm of (lat, lng).
 * Returns array of { providerId, lat, lng, dist, status, name, email }.
 */
async function findNearbyProviders(lat, lng, radiusKm = 10) {
  const now = Date.now()
  const r = getRedis()
  if (r && isRedisAvailable()) {
    try {
      // GEOSEARCH returns members within radius with coordinates and distance
      const results = await r.geosearch(
        'geo:providers',
        'FROMLONLAT', lng, lat,
        'BYRADIUS', radiusKm, 'km',
        'WITHCOORD', 'WITHDIST', 'ASC'
      )
      if (!results || results.length === 0) return []

      const providers = []
      for (const [providerId, dist, coords] of results) {
        // Fetch metadata for each provider
        const meta = await r.hgetall(`provider:meta:${providerId}`)
        if (!meta || !meta.updatedAt) continue
        if (now - Number(meta.updatedAt) > STALE_POSITION_MS) continue

        providers.push({
          providerId,
          lat: Number(coords[1]),
          lng: Number(coords[0]),
          dist: Number(dist),
          status: meta.status || 'available',
          name: meta.name || '',
          email: meta.email || '',
          viewingRequestId: meta.viewingRequestId || null,
          missionRequestId: meta.missionRequestId || null,
        })
      }
      // Sort by status priority (available first)
      providers.sort((a, b) => {
        const score = (p) => (p.status === 'available' ? 0 : p.status === 'viewing' ? 1 : p.status === 'on_mission' ? 2 : 3)
        return score(a) - score(b)
      })
      return providers
    } catch (err) {
      console.warn('[Redis] findNearbyProviders failed, fallback:', err.message)
    }
  }

  // In-memory fallback
  const providers = []
  for (const [providerId, pos] of memPresence.entries()) {
    if (!pos.lat || !pos.lng) continue
    if (now - (pos.updatedAt || 0) > STALE_POSITION_MS) continue
    const dist = haversineKm(lat, lng, pos.lat, pos.lng)
    if (dist <= radiusKm) {
      providers.push({
        providerId,
        lat: pos.lat,
        lng: pos.lng,
        dist,
        status: pos.status || 'available',
        name: pos.name || '',
        email: pos.email || '',
        viewingRequestId: pos.viewingRequestId || null,
        missionRequestId: pos.missionRequestId || null,
      })
    }
  }
  providers.sort((a, b) => {
    const score = (p) => (p.status === 'available' ? 0 : p.status === 'viewing' ? 1 : p.status === 'on_mission' ? 2 : 3)
    return score(a) - score(b)
  })
  return providers
}

/**
 * Set provider offline (does not remove position immediately).
 */
async function setProviderOffline(providerId) {
  await updateProviderMeta(providerId, { status: 'offline' })
}

/**
 * Remove provider from Redis (cleanup).
 */
async function removeProvider(providerId) {
  const r = getRedis()
  if (r && isRedisAvailable()) {
    try {
      const pipeline = r.pipeline()
      pipeline.zrem('geo:providers', providerId)
      pipeline.del(`provider:meta:${providerId}`)
      await pipeline.exec()
      return
    } catch (err) {
      console.warn('[Redis] removeProvider failed, fallback:', err.message)
    }
  }
  memPresence.delete(providerId)
}

/**
 * Cleanup stale positions (called periodically).
 */
async function cleanupStale() {
  const now = Date.now()
  const r = getRedis()
  if (r && isRedisAvailable()) {
    try {
      // Get all provider IDs from the GEO set
      const members = await r.zrange('geo:providers', 0, -1)
      let cleaned = 0
      for (const providerId of members) {
        const meta = await r.hgetall(`provider:meta:${providerId}`)
        if (!meta || !meta.updatedAt || now - Number(meta.updatedAt) > STALE_POSITION_MS) {
          await removeProvider(providerId)
          cleaned++
        }
      }
      if (cleaned > 0) console.log(`[Redis] Cleaned ${cleaned} stale provider position(s)`)
      return
    } catch (err) {
      console.warn('[Redis] cleanupStale failed, fallback:', err.message)
    }
  }
  // In-memory fallback
  let cleaned = 0
  for (const [id, pos] of memPresence.entries()) {
    if (now - (pos.updatedAt || 0) > STALE_POSITION_MS) {
      memPresence.delete(id)
      cleaned++
    }
  }
  if (cleaned > 0) console.log(`[Redis] Cleaned ${cleaned} stale provider position(s) [memory]`)
}

/**
 * Get total tracked provider count.
 */
async function getProviderCount() {
  const r = getRedis()
  if (r && isRedisAvailable()) {
    try {
      return await r.zcard('geo:providers')
    } catch (err) {
      console.warn('[Redis] getProviderCount failed, fallback:', err.message)
    }
  }
  return memPresence.size
}

/**
 * Haversine distance in km (used for in-memory fallback only).
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

module.exports = {
  getRedis,
  isRedisAvailable,
  updateProviderPosition,
  updateProviderMeta,
  findNearbyProviders,
  setProviderOffline,
  removeProvider,
  cleanupStale,
  getProviderCount,
  STALE_POSITION_MS,
}
