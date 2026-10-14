import { NextRequest, NextResponse } from 'next/server'
import { logSecurityViolation, logDataAccess } from './security-logger'

export interface SessionData {
  sessionId: string
  userId: string
  role: string
  createdAt: number
  lastActivity: number
  expiresAt: number
  deviceFingerprint?: string
  ipAddress: string
  userAgent: string
}

class SessionManager {
  private sessions: Map<string, SessionData> = new Map()
  private readonly sessionTimeout = 30 * 60 * 1000 // 30 minutes
  private readonly maxSessionAge = 8 * 60 * 60 * 1000 // 8 heures

  constructor() {
    // Nettoyer les sessions expirées toutes les 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000)
  }

  private generateSessionId(): string {
    return crypto.randomUUID().replace(/-/g, '')
  }

  private getClientInfo(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || // Cloudflare
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    return { ip, userAgent }
  }

  public createSession(
    userId: string,
    role: string,
    request: NextRequest,
    deviceFingerprint?: string
  ): SessionData {
    const sessionId = this.generateSessionId()
    const now = Date.now()
    const { ip, userAgent } = this.getClientInfo(request)

    const sessionData: SessionData = {
      sessionId,
      userId,
      role,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.maxSessionAge,
      deviceFingerprint,
      ipAddress: ip,
      userAgent
    }

    this.sessions.set(sessionId, sessionData)
    
    logDataAccess('session', 'create', request, userId, {
      sessionId: sessionId.substring(0, 8) + '...',
      role
    })

    return sessionData
  }

  public validateSession(
    sessionId: string,
    request: NextRequest
  ): { valid: boolean; session?: SessionData; reason?: string } {
    const session = this.sessions.get(sessionId)
    const now = Date.now()
    const { ip, userAgent } = this.getClientInfo(request)

    if (!session) {
      logSecurityViolation('session_not_found', request, { sessionId: sessionId.substring(0, 8) + '...' })
      return { valid: false, reason: 'Session non trouvée' }
    }

    // Vérifier expiration absolue
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId)
      logSecurityViolation('session_expired_max', request, { 
        sessionId: sessionId.substring(0, 8) + '...',
        userId: session.userId
      })
      return { valid: false, reason: 'Session expirée (durée maximale)' }
    }

    // Vérifier timeout d'inactivité
    if (now - session.lastActivity > this.sessionTimeout) {
      this.sessions.delete(sessionId)
      logSecurityViolation('session_expired_timeout', request, { 
        sessionId: sessionId.substring(0, 8) + '...',
        userId: session.userId,
        inactiveFor: Math.round((now - session.lastActivity) / 60000) + ' minutes'
      })
      return { valid: false, reason: 'Session expirée (inactivité)' }
    }

    // Vérifier changement d'IP (sécurité renforcée)
    if (session.ipAddress !== ip) {
      logSecurityViolation('session_ip_change', request, { 
        sessionId: sessionId.substring(0, 8) + '...',
        userId: session.userId,
        originalIp: session.ipAddress,
        newIp: ip
      })
      // En production, on pourrait invalider la session
      // Pour l'instant, on log seulement
    }

    // Vérifier changement d'User-Agent (détection de hijacking)
    if (session.userAgent !== userAgent) {
      logSecurityViolation('session_useragent_change', request, { 
        sessionId: sessionId.substring(0, 8) + '...',
        userId: session.userId
      })
    }

    // Mettre à jour l'activité
    session.lastActivity = now
    this.sessions.set(sessionId, session)

    logDataAccess('session', 'validate', request, session.userId, {
      sessionId: sessionId.substring(0, 8) + '...'
    })

    return { valid: true, session }
  }

  public refreshSession(sessionId: string, request: NextRequest): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const now = Date.now()
    session.lastActivity = now
    session.expiresAt = now + this.maxSessionAge // Renouveler la durée maximale
    
    this.sessions.set(sessionId, session)
    
    logDataAccess('session', 'refresh', request, session.userId, {
      sessionId: sessionId.substring(0, 8) + '...'
    })

    return true
  }

  public destroySession(sessionId: string, request: NextRequest): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    this.sessions.delete(sessionId)
    
    logDataAccess('session', 'destroy', request, session.userId, {
      sessionId: sessionId.substring(0, 8) + '...'
    })

    return true
  }

  public getUserSessions(userId: string): SessionData[] {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId)
  }

  public destroyUserSessions(userId: string, request: NextRequest): number {
    const userSessions = this.getUserSessions(userId)
    let destroyed = 0

    userSessions.forEach(session => {
      this.sessions.delete(session.sessionId)
      destroyed++
    })

    if (destroyed > 0) {
      logDataAccess('session', 'destroy_all_user', request, userId, {
        destroyedCount: destroyed
      })
    }

    return destroyed
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt || (now - session.lastActivity) > this.sessionTimeout) {
        this.sessions.delete(sessionId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Nettoyage automatique: ${cleaned} sessions expirées supprimées`)
    }
  }

  public getSessionStats(): {
    totalSessions: number
    activeSessions: number
    expiredSessions: number
    sessionsByRole: Record<string, number>
  } {
    const now = Date.now()
    const allSessions = Array.from(this.sessions.values())
    
    const activeSessions = allSessions.filter(s => 
      now <= s.expiresAt && (now - s.lastActivity) <= this.sessionTimeout
    ).length

    const expiredSessions = allSessions.length - activeSessions

    const sessionsByRole: Record<string, number> = {}
    allSessions.forEach(session => {
      sessionsByRole[session.role] = (sessionsByRole[session.role] || 0) + 1
    })

    return {
      totalSessions: allSessions.length,
      activeSessions,
      expiredSessions,
      sessionsByRole
    }
  }
}

export const sessionManager = new SessionManager()

// Middleware helper pour vérifier les sessions
export function requireValidSession(request: NextRequest): Response | SessionData {
  const sessionId = request.cookies.get('session-id')?.value ||
                   request.headers.get('x-session-id')

  if (!sessionId) {
    logSecurityViolation('missing_session_id', request)
    return new Response(
      JSON.stringify({ error: 'Session requise' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  const validation = sessionManager.validateSession(sessionId, request)
  
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ 
        error: 'Session invalide',
        reason: validation.reason
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return validation.session!
}

// Helper pour créer une réponse avec session
export function createSessionResponse(
  data: any,
  session: SessionData,
  request: NextRequest
): NextResponse {
  const response = NextResponse.json(data)
  
  // Ajouter le cookie de session sécurisé
  response.cookies.set('session-id', session.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: Math.floor(sessionManager['sessionTimeout'] / 1000),
    path: '/'
  })

  // Headers de sécurité pour la session
  response.headers.set('X-Session-Expires', new Date(session.expiresAt).toISOString())
  response.headers.set('X-Session-Timeout', Math.floor(sessionManager['sessionTimeout'] / 1000).toString())

  return response
}