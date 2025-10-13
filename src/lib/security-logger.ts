import { NextRequest } from 'next/server'

export interface SecurityEvent {
  timestamp: string
  eventType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  ip: string
  userAgent: string
  details: Record<string, any>
  sessionId?: string
}

class SecurityLogger {
  private events: SecurityEvent[] = []
  private maxEvents: number = 10000

  private getClientInfo(request?: NextRequest) {
    if (!request) {
      return {
        ip: 'unknown',
        userAgent: 'unknown'
      }
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') || // Cloudflare
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    return { ip, userAgent }
  }

  public logEvent(
    eventType: string,
    severity: SecurityEvent['severity'],
    details: Record<string, any> = {},
    request?: NextRequest,
    userId?: string,
    sessionId?: string
  ): void {
    const { ip, userAgent } = this.getClientInfo(request)
    
    const event: SecurityEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      userId,
      ip,
      userAgent,
      details,
      sessionId
    }

    this.events.push(event)
    
    // Garder seulement les derniers événements
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Log en console selon la gravité
    this.logToConsole(event)
    
    // En production, envoyer vers un service de monitoring
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(event)
    }
  }

  private logToConsole(event: SecurityEvent): void {
    const logMessage = `[SECURITY] ${event.eventType} - ${event.severity.toUpperCase()} - IP: ${event.ip} - User: ${event.userId || 'anonymous'}`
    
    switch (event.severity) {
      case 'critical':
        console.error(`🚨 ${logMessage}`, event.details)
        break
      case 'high':
        console.warn(`⚠️ ${logMessage}`, event.details)
        break
      case 'medium':
        console.warn(`⚡ ${logMessage}`, event.details)
        break
      case 'low':
        console.log(`ℹ️ ${logMessage}`, event.details)
        break
    }
  }

  private sendToMonitoring(event: SecurityEvent): void {
    // Ici on pourrait envoyer vers Sentry, DataDog, etc.
    // Pour l'instant, on stocke dans un fichier de log
    if (event.severity === 'critical' || event.severity === 'high') {
      // Log les événements critiques
      console.error('[SECURITY-ALERT]', JSON.stringify(event))
    }
  }

  // Méthodes spécifiques pour les événements courants
  public logLoginAttempt(success: boolean, request: NextRequest, userId?: string, details: Record<string, any> = {}): void {
    this.logEvent(
      success ? 'login_success' : 'login_failure',
      success ? 'low' : 'medium',
      { success, ...details },
      request,
      userId
    )
  }

  public logFailedAuth(reason: string, request: NextRequest, details: Record<string, any> = {}): void {
    this.logEvent(
      'auth_failure',
      'high',
      { reason, ...details },
      request
    )
  }

  public logSuspiciousActivity(activity: string, request: NextRequest, details: Record<string, any> = {}): void {
    this.logEvent(
      'suspicious_activity',
      'high',
      { activity, ...details },
      request
    )
  }

  public logDataAccess(resource: string, action: string, request: NextRequest, userId?: string, details: Record<string, any> = {}): void {
    this.logEvent(
      'data_access',
      'low',
      { resource, action, ...details },
      request,
      userId
    )
  }

  public logSecurityViolation(violation: string, request: NextRequest, details: Record<string, any> = {}): void {
    this.logEvent(
      'security_violation',
      'critical',
      { violation, ...details },
      request
    )
  }

  // Récupérer les événements pour monitoring
  public getEvents(filter?: {
    severity?: SecurityEvent['severity']
    eventType?: string
    userId?: string
    since?: Date
  }): SecurityEvent[] {
    let filteredEvents = this.events

    if (filter) {
      filteredEvents = this.events.filter(event => {
        if (filter.severity && event.severity !== filter.severity) return false
        if (filter.eventType && event.eventType !== filter.eventType) return false
        if (filter.userId && event.userId !== filter.userId) return false
        if (filter.since && new Date(event.timestamp) < filter.since) return false
        return true
      })
    }

    return filteredEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  public getSecurityStats(): {
    totalEvents: number
    criticalEvents: number
    highEvents: number
    recentActivity: number
    topIPs: Array<{ ip: string; count: number }>
  } {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    const recentEvents = this.events.filter(e => new Date(e.timestamp) > oneHourAgo)
    const criticalEvents = this.events.filter(e => e.severity === 'critical').length
    const highEvents = this.events.filter(e => e.severity === 'high').length
    
    // Compter les IPs
    const ipCounts: Record<string, number> = {}
    this.events.forEach(event => {
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1
    })
    
    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalEvents: this.events.length,
      criticalEvents,
      highEvents,
      recentActivity: recentEvents.length,
      topIPs
    }
  }
}

// Instance globale
export const securityLogger = new SecurityLogger()

// Helper functions pour un usage facile
export const logLoginAttempt = (success: boolean, request: NextRequest, userId?: string, details?: Record<string, any>) => 
  securityLogger.logLoginAttempt(success, request, userId, details)

export const logFailedAuth = (reason: string, request: NextRequest, details?: Record<string, any>) => 
  securityLogger.logFailedAuth(reason, request, details)

export const logSuspiciousActivity = (activity: string, request: NextRequest, details?: Record<string, any>) => 
  securityLogger.logSuspiciousActivity(activity, request, details)

export const logDataAccess = (resource: string, action: string, request: NextRequest, userId?: string, details?: Record<string, any>) => 
  securityLogger.logDataAccess(resource, action, request, userId, details)

export const logSecurityViolation = (violation: string, request: NextRequest, details?: Record<string, any>) => 
  securityLogger.logSecurityViolation(violation, request, details)