/**
 * API Admin Analytics - Statistiques de visites
 * 
 * GET /api/admin/analytics/visits
 * Récupère les statistiques de visites pour le dashboard admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PageVisit from '@/lib/models/PageVisit'
import jwt from 'jsonwebtoken'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
  if (String(decoded.role || '').toUpperCase() !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Statistiques globales
    const [
      totalVisits,
      uniqueVisitors,
      authenticatedVisits,
      visitsByPageType,
      topPages,
      visitsByDay,
      visitsByDevice,
      visitsByBrowser,
      visitsByOS,
      topReferrers,
      topIPs,
      topAnonymousIPs,
      recentVisits
    ] = await Promise.all([
      // Total visites
      PageVisit.countDocuments({ visitedAt: { $gte: startDate } }),
      
      // Visiteurs uniques (par IP + UserId)
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate } } },
        { $group: { _id: { ip: '$ipAddress', userId: '$userId' } } },
        { $count: 'total' }
      ]),
      
      // Visites authentifiées
      PageVisit.countDocuments({ 
        visitedAt: { $gte: startDate },
        isAuthenticated: true 
      }),
      
      // Visites par type de page
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate } } },
        { $group: { _id: '$pageType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Pages les plus visitées
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate } } },
        { $group: { 
          _id: '$path', 
          count: { $sum: 1 },
          pageName: { $first: '$pageName' }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Visites par jour (courbe)
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitedAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Visites par appareil
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate }, deviceType: { $exists: true } } },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Visites par navigateur
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate }, browser: { $exists: true } } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Visites par OS
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate }, os: { $exists: true } } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Principales origines (referrers)
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate }, referrer: { $exists: true, $ne: '' } } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Top IPs (volume)
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate }, ipAddress: { $exists: true, $nin: ['', 'unknown'] } } },
        { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Top IPs anonymes (utile pour repérer trafic suspect)
      PageVisit.aggregate([
        { $match: { visitedAt: { $gte: startDate }, isAuthenticated: false, ipAddress: { $exists: true, $nin: ['', 'unknown'] } } },
        { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      // Dernières visites détaillées (pour IP, rôle, device, etc.)
      PageVisit.find({ visitedAt: { $gte: startDate } })
        .sort({ visitedAt: -1 })
        .limit(50)
        .select('path pageName pageType ipAddress userRole userId isAuthenticated sessionId userAgent deviceType browser os referrer duration scrollDepth interactions visitedAt')
    ])

    // Statistiques de la période précédente (pour comparaison)
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - days)
    
    const previousTotalVisits = await PageVisit.countDocuments({
      visitedAt: { $gte: previousStartDate, $lt: startDate }
    })

    const growth = previousTotalVisits > 0
      ? ((totalVisits - previousTotalVisits) / previousTotalVisits) * 100
      : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalVisits,
        uniqueVisitors: uniqueVisitors[0]?.total || 0,
        authenticatedVisits,
        anonymousVisits: totalVisits - authenticatedVisits,
        growth: Math.round(growth * 100) / 100,
        visitsByPageType: visitsByPageType.map((item: any) => ({
          type: item._id,
          count: item.count
        })),
        topPages: topPages.map((item: any) => ({
          path: item._id,
          pageName: item.pageName,
          visits: item.count
        })),
        visitsByDay: visitsByDay.map((item: any) => ({
          date: item._id,
          count: item.count
        })),
        visitsByDevice: visitsByDevice.map((item: any) => ({
          device: item._id,
          count: item.count
        })),
        visitsByBrowser: visitsByBrowser.map((item: any) => ({
          browser: item._id,
          count: item.count
        })),
        visitsByOS: visitsByOS.map((item: any) => ({
          os: item._id,
          count: item.count
        })),
        topReferrers: topReferrers.map((item: any) => ({
          referrer: item._id,
          count: item.count
        })),
        topIPs: topIPs.map((item: any) => ({
          ip: item._id,
          count: item.count
        })),
        topAnonymousIPs: topAnonymousIPs.map((item: any) => ({
          ip: item._id,
          count: item.count
        })),
        recentVisits: recentVisits.map((visit: any) => ({
          id: String(visit._id),
          path: visit.path,
          pageName: visit.pageName,
          pageType: visit.pageType,
          ipAddress: visit.ipAddress || 'inconnue',
          userId: visit.userId ? String(visit.userId) : undefined,
          userRole: visit.userRole || 'Anonyme',
          isAuthenticated: !!visit.isAuthenticated,
          sessionId: visit.sessionId || undefined,
          userAgent: visit.userAgent || undefined,
          deviceType: visit.deviceType,
          browser: visit.browser,
          os: visit.os,
          referrer: visit.referrer,
          duration: typeof visit.duration === 'number' ? visit.duration : undefined,
          scrollDepth: typeof visit.scrollDepth === 'number' ? visit.scrollDepth : undefined,
          interactions: typeof visit.interactions === 'number' ? visit.interactions : undefined,
          visitedAt: visit.visitedAt
        }))
      }
    })
  } catch (error: any) {
    console.error('Erreur récupération stats visites:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la récupération' },
      { status: error.message?.includes('authentifié') || error.message?.includes('autorisé') ? 401 : 500 }
    )
  }
}

