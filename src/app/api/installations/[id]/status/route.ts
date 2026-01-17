/**
 * API Mise à jour Statut Installation
 * 
 * PATCH /api/installations/[id]/status
 * Met à jour le statut d'une installation
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Installation from '@/lib/models/Installation'
import { jwtVerify } from 'jose'
import { getJwtSecretKey } from '@/lib/jwt-secret'

async function verifyToken(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const secret = getJwtSecretKey()
  const { payload } = await jwtVerify(token, secret)
  return {
    userId: payload.userId as string,
    role: String(payload.role || '').toUpperCase(),
    technicianId: payload.technicianId as string | undefined
  }
}

/**
 * PATCH /api/installations/[id]/status
 * Met à jour le statut d'une installation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role, technicianId } = await verifyToken(request)
    const { id } = await params
    await connectMongoose()

    const body = await request.json()
    const { status, notes } = body

    if (!status || !['pending', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      )
    }

    const installation = await Installation.findById(id)
    if (!installation) {
      return NextResponse.json({ error: 'Installation non trouvée' }, { status: 404 })
    }

    // Vérifier les permissions
    if (role === 'TECHNICIAN') {
      if (installation.assignedTechnicianId?.toString() !== technicianId) {
        return NextResponse.json(
          { error: 'Vous n\'êtes pas assigné à cette installation' },
          { status: 403 }
        )
      }
    } else if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Validation des transitions de statut
    const validTransitions: Record<string, string[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    }

    if (!validTransitions[installation.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Transition invalide de ${installation.status} vers ${status}` },
        { status: 400 }
      )
    }

    // Mettre à jour
    installation.status = status as any
    if (notes) installation.notes = notes

    if (status === 'completed' && !installation.completedDate) {
      installation.completedDate = new Date()
    }

    await installation.save()

    return NextResponse.json({
      success: true,
      installation: {
        id: installation._id.toString(),
        status: installation.status,
        completedDate: installation.completedDate,
        updatedAt: installation.updatedAt
      }
    })
  } catch (error) {
    console.error('Erreur mise à jour statut installation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

