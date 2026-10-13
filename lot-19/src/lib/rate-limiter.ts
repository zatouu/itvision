import { NextRequest } from 'next/server'
import { getRedisClient } from '@/lib/redis'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

export class RateLimiter {
  private store: RateLimitStore = {}
  private windowMs: number
  public maxRequests: number
  private keyByIpOnly: boolean

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100, keyByIpOnly: boolean = false) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.keyByIpOnly = keyByIpOnly
    
    // Nettoyer les entrées expirées toutes les 5 minutes
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private getKey(request: NextRequest): string {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || // Cloudflare
               'unknown'
    if (this.keyByIpOnly) {
      return ip
    }
    // Utiliser l'IP + User-Agent comme clé unique
    const userAgent = request.headers.get('user-agent') || 'unknown'
    return `${ip}:${userAgent.substring(0, 50)}`
  }

  private cleanup(): void {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  public async check(request: NextRequest): Promise<{ 
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const key = this.getKey(request)
    const now = Date.now()

    try {
      const redis = getRedisClient()
      if (redis && redis.status === 'ready') {
        const ttlSec = Math.max(1, Math.ceil(this.windowMs / 1000))
        const redisKey = `rate:${this.windowMs}:${this.maxRequests}:${key}`
        const results = await redis.multi().incr(redisKey).expire(redisKey, ttlSec, 'NX').exec()

        let count = 0
        if (Array.isArray(results) && results[0]) {
          const first = results[0]
          count = Array.isArray(first) ? ((first[1] as number) || 0) : ((first as number) || 0)
        }

        const allowed = count <= this.maxRequests
        return {
          allowed,
          remaining: Math.max(0, this.maxRequests - count),
          resetTime: now + this.windowMs,
          retryAfter: allowed ? undefined : Math.ceil(this.windowMs / 1000)
        }
      }
    } catch (err) {
      console.error('[RateLimiter] Redis error, fallback mémoire', err)
    }
    
    if (!this.store[key] || this.store[key].resetTime < now) {
      // Nouvelle fenêtre
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs
      }
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: this.store[key].resetTime
      }
    }
    
    // Fenêtre existante
    this.store[key].count++
    
    if (this.store[key].count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.store[key].resetTime,
        retryAfter: Math.ceil((this.store[key].resetTime - now) / 1000)
      }
    }
    
    return {
      allowed: true,
      remaining: this.maxRequests - this.store[key].count,
      resetTime: this.store[key].resetTime
    }
  }
}

// Instances pour différents types d'endpoints
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 5) // 5 tentatives de login par 15 min
export const registerRateLimiter = new RateLimiter(15 * 60 * 1000, 3, true) // 3 inscriptions par 15 min par IP
export const apiRateLimiter = new RateLimiter(15 * 60 * 1000, 100) // 100 requêtes API par 15 min
export const uploadRateLimiter = new RateLimiter(60 * 60 * 1000, 10) // 10 uploads par heure
export const serviceWriteRateLimiter = new RateLimiter(15 * 60 * 1000, 10) // 10 créations requêtes/offres par 15 min
export const serviceReadRateLimiter = new RateLimiter(60 * 1000, 30) // 30 requêtes read par minute
export const aiRateLimiter = new RateLimiter(15 * 60 * 1000, 30) // 30 AI requests per 15 min
export const quoteActionRateLimiter = new RateLimiter(15 * 60 * 1000, 20) // 20 actions devis par 15 min

// Helper function pour appliquer le rate limiting
export async function applyRateLimit(
  request: NextRequest, 
  limiter: RateLimiter = apiRateLimiter
): Promise<Response | null> {
  // Bypass E2E : les suites Playwright multi-projets effectuent des dizaines
  // de logins/créations en quelques minutes — sans bypass, tout finit en 429.
  if (process.env.DISABLE_RATE_LIMIT === 'true') return null
  const result = await limiter.check(request)
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Trop de requêtes',
        message: 'Limite de taux dépassée. Veuillez réessayer plus tard.',
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': result.retryAfter?.toString() || '900'
        }
      }
    )
  }
  
  return null
}