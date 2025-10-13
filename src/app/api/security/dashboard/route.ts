import { NextRequest, NextResponse } from 'next/server'
import { securityLogger } from '@/lib/security-logger'
import { sessionManager } from '@/lib/session-manager'
import { requireValidSession } from '@/lib/session-manager'
import { logDataAccess } from '@/lib/security-logger'

export async function GET(request: NextRequest) {
  // Vérifier que l'utilisateur est admin
  const sessionResult = requireValidSession(request)
  if (sessionResult instanceof Response) {
    return sessionResult
  }

  const session = sessionResult as any
  if (session.role !== 'admin' && session.role !== 'supervisor') {
    return NextResponse.json(
      { error: 'Accès non autorisé' },
      { status: 403 }
    )
  }

  logDataAccess('security_dashboard', 'view', request, session.userId)

  try {
    // Statistiques de sécurité
    const securityStats = securityLogger.getSecurityStats()
    const sessionStats = sessionManager.getSessionStats()
    
    // Événements récents critiques
    const criticalEvents = securityLogger.getEvents({
      severity: 'critical',
      since: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
    }).slice(0, 10)

    // Événements récents de haut niveau
    const highEvents = securityLogger.getEvents({
      severity: 'high',
      since: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
    }).slice(0, 20)

    // Tentatives de login échouées récentes
    const failedLogins = securityLogger.getEvents({
      eventType: 'login_failure',
      since: new Date(Date.now() - 60 * 60 * 1000) // Dernière heure
    })

    const dashboard = {
      summary: {
        ...securityStats,
        ...sessionStats,
        lastUpdate: new Date().toISOString()
      },
      alerts: {
        critical: criticalEvents,
        high: highEvents,
        failedLogins: failedLogins.length,
        suspiciousIPs: securityStats.topIPs.filter(ip => ip.count > 50)
      },
      recommendations: generateSecurityRecommendations(securityStats, sessionStats)
    }

    return NextResponse.json(dashboard)
  } catch (error) {
    console.error('Erreur dashboard sécurité:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

function generateSecurityRecommendations(
  securityStats: any,
  sessionStats: any
): Array<{
  type: 'warning' | 'info' | 'critical'
  message: string
  action?: string
}> {
  const recommendations = []

  // Vérifications automatiques
  if (securityStats.criticalEvents > 0) {
    recommendations.push({
      type: 'critical' as const,
      message: `${securityStats.criticalEvents} événement(s) critique(s) détecté(s)`,
      action: 'Vérifier immédiatement les logs de sécurité'
    })
  }

  if (securityStats.highEvents > 10) {
    recommendations.push({
      type: 'warning' as const,
      message: `Nombre élevé d'événements de sécurité (${securityStats.highEvents})`,
      action: 'Analyser les patterns d\'attaque'
    })
  }

  if (sessionStats.activeSessions > 100) {
    recommendations.push({
      type: 'info' as const,
      message: `Nombre élevé de sessions actives (${sessionStats.activeSessions})`,
      action: 'Surveiller la charge du serveur'
    })
  }

  if (securityStats.topIPs.some((ip: any) => ip.count > 1000)) {
    recommendations.push({
      type: 'warning' as const,
      message: 'Activité suspecte détectée depuis certaines IPs',
      action: 'Considérer le blocage des IPs suspectes'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info' as const,
      message: 'Aucun problème de sécurité détecté',
      action: 'Continuer la surveillance'
    })
  }

  return recommendations
}