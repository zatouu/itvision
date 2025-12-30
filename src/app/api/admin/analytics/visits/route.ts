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

// Secret JWT harmonisé avec le reste de l'application
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production-very-long-and-secure-key-123456789'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, JWT_SECRET) as any
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
      visitsByBrowser
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
      ])
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

