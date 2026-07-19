import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/redis'

interface LimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, LimitEntry>()

export interface RateLimitOptions {
  windowMs?: number
  max?: number
  keyPrefix?: string
}

function cleanup(now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

export async function rateLimitRequest(
  req: NextRequest,
  options: RateLimitOptions = {}
): Promise<{ ok: boolean; retryAfter: number } | null> {
  const { windowMs = 60_000, max = 10, keyPrefix = '' } = options
  const now = Date.now()
  const ip = getClientIp(req)
  const key = `${keyPrefix}:${ip}`

  cleanup(now)

  try {
    const redis = getRedisClient()
    if (redis && redis.status === 'ready') {
      const ttlSec = Math.max(1, Math.ceil(windowMs / 1000))
      const redisKey = `rate:simple:${keyPrefix}:${ip}`
      const results = await redis.multi().incr(redisKey).expire(redisKey, ttlSec, 'NX').exec()

      let count = 0
      if (Array.isArray(results) && results[0]) {
        const first = results[0]
        count = Array.isArray(first) ? ((first[1] as number) || 0) : ((first as number) || 0)
      }

      if (count >= max) {
        return { ok: false, retryAfter: ttlSec }
      }
      return { ok: true, retryAfter: 0 }
    }
  } catch (err) {
    console.error('[rateLimitRequest] Redis error, fallback mémoire', err)
  }

  const entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (entry.count >= max) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count += 1
  return { ok: true, retryAfter: 0 }
}

export function tooManyResponse(retryAfter: number) {
  return NextResponse.json(
    { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
