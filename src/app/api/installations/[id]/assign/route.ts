/**
 * API Affectation Installation
 * 
 * POST /api/installations/[id]/assign
 * Affecte automatiquement ou manuellement un technicien
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Installation from '@/lib/models/Installation'
import Technician from '@/lib/models/Technician'
import { jwtVerify } from 'jose'

async function verifyToken(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  return {
    userId: payload.userId as string,
    role: String(payload.role || '').toUpperCase()
  }
}

/**
 * POST /api/installations/[id]/assign
 * Affecte un technicien (automatique ou manuel)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await verifyToken(request)
    if (!['ADMIN', 'TECHNICIAN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    await connectMongoose()

    const body = await request.json()
    const { technicianId, autoAssign = false } = body

    const installation = await Installation.findById(id)
    if (!installation) {
      return NextResponse.json({ error: 'Installation non trouvée' }, { status: 404 })
    }

    if (installation.status !== 'pending') {
      return NextResponse.json(
        { error: 'L\'installation doit être en statut pending pour être affectée' },
        { status: 400 }
      )
    }

    let assignedTechnicianId = technicianId
    let assignedTechnicianName = 'Technicien'

    // Affectation automatique
    if (autoAssign || !technicianId) {
      const technicians = await Technician.find({
        isAvailable: true,
        'stats.completionRate': { $gte: 80 }
      }).lean()

      if (technicians.length === 0) {
        return NextResponse.json(
          { error: 'Aucun technicien disponible pour l\'affectation automatique' },
          { status: 404 }
        )
      }

      // Algorithme de scoring
      const scored = technicians.map((tech: any) => {
        let score = 0
        
        // Zone géographique (si disponible)
        if (installation.clientContact.address && tech.preferences?.zone) {
          // Logique de proximité simplifiée
          score += 20
        }
        
        // Rating
        score += (tech.stats?.averageRating || 0) * 10
        
        // Disponibilité (charge de travail)
        score += (100 - (tech.currentLoad || 0)) * 0.3
        
        // Taux de complétion
        score += (tech.stats?.completionRate || 0) * 0.2
        
        return { ...tech, score }
      })

      scored.sort((a, b) => b.score - a.score)
      const best = scored[0]
      
      assignedTechnicianId = best._id.toString()
      assignedTechnicianName = best.name || best.email || 'Technicien'
    } else {
      // Affectation manuelle
      const technician = await Technician.findById(technicianId).lean()
      if (!technician) {
        return NextResponse.json({ error: 'Technicien non trouvé' }, { status: 404 })
      }
      assignedTechnicianName = (technician as any).name || (technician as any).email || 'Technicien'
    }

    // Mettre à jour l'installation
    installation.assignedTechnicianId = assignedTechnicianId as any
    installation.assignedTechnicianName = assignedTechnicianName
    installation.assignedAt = new Date()
    installation.status = 'assigned'
    installation.autoAssigned = autoAssign || !technicianId

    await installation.save()

    return NextResponse.json({
      success: true,
      installation: {
        id: installation._id.toString(),
        status: installation.status,
        assignedTechnicianId: installation.assignedTechnicianId?.toString(),
        assignedTechnicianName: installation.assignedTechnicianName,
        assignedAt: installation.assignedAt
      }
    })
  } catch (error) {
    console.error('Erreur affectation installation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

