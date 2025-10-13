import { NextRequest } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private windowMs: number
  public maxRequests: number

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    
    // Nettoyer les entrées expirées toutes les 5 minutes
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private getKey(request: NextRequest): string {
    // Utiliser l'IP + User-Agent comme clé unique
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || // Cloudflare
               'unknown'
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

  public check(request: NextRequest): { 
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  } {
    const key = this.getKey(request)
    const now = Date.now()
    
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
export const apiRateLimiter = new RateLimiter(15 * 60 * 1000, 100) // 100 requêtes API par 15 min
export const uploadRateLimiter = new RateLimiter(60 * 60 * 1000, 10) // 10 uploads par heure

// Helper function pour appliquer le rate limiting
export function applyRateLimit(
  request: NextRequest, 
  limiter: RateLimiter = apiRateLimiter
): Response | null {
  const result = limiter.check(request)
  
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