/**
 * API Analytics - Enregistrement des visites
 * 
 * POST /api/analytics/track
 * Enregistre une visite de page
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PageVisit from '@/lib/models/PageVisit'
import { jwtVerify } from 'jose'
import { getJwtSecretKey } from '@/lib/jwt-secret'

// Helper pour détecter le type d'appareil
function detectDevice(userAgent?: string): 'desktop' | 'mobile' | 'tablet' {
  if (!userAgent) return 'desktop'
  const ua = userAgent.toLowerCase()
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet'
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile'
  return 'desktop'
}

// Helper pour détecter le navigateur
function detectBrowser(userAgent?: string): string {
  if (!userAgent) return 'Unknown'
  const ua = userAgent.toLowerCase()
  if (ua.includes('chrome')) return 'Chrome'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('edge')) return 'Edge'
  if (ua.includes('opera')) return 'Opera'
  return 'Other'
}

// Helper pour détecter l'OS
function detectOS(userAgent?: string): string {
  if (!userAgent) return 'Unknown'
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  return 'Other'
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    
    const body = await request.json()
    const {
      path,
      pageName,
      duration,
      scrollDepth,
      interactions = 0
    } = body

    if (!path || !pageName) {
      return NextResponse.json(
        { success: false, error: 'Path et pageName requis' },
        { status: 400 }
      )
    }

    // Déterminer le type de page
    let pageType: 'public' | 'admin' | 'client' | 'technician' = 'public'
    if (path.startsWith('/admin')) pageType = 'admin'
    else if (path.startsWith('/client')) pageType = 'client'
    else if (path.startsWith('/technicien')) pageType = 'technician'

    // Récupérer les infos utilisateur si connecté
    let userId: string | undefined
    let userRole: string | undefined
    let isAuthenticated = false
    let sessionId: string | undefined

    try {
      const token = request.cookies.get('auth-token')?.value ||
        request.headers.get('authorization')?.replace('Bearer ', '')
      
      if (token) {
        const { payload } = await jwtVerify(
          token,
          getJwtSecretKey()
        )
        userId = payload.userId as string
        userRole = payload.role as string
        isAuthenticated = true
        sessionId = payload.sessionId as string
      }
    } catch {
      // Token invalide ou absent, visite anonyme
    }

    // Récupérer les infos client
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || body.referrer

    // Créer la visite
    const visit = await PageVisit.create({
      path,
      pageName,
      pageType,
      userId: userId ? userId : undefined,
      userRole,
      isAuthenticated,
      sessionId,
      ipAddress,
      userAgent,
      referrer,
      duration,
      scrollDepth,
      interactions,
      deviceType: detectDevice(userAgent),
      browser: detectBrowser(userAgent),
      os: detectOS(userAgent),
      visitedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      visitId: visit._id
    })
  } catch (error: any) {
    console.error('Erreur tracking visite:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'enregistrement' },
      { status: 500 }
    )
  }
}

