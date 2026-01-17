import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import MaintenanceBid from '@/lib/models/MaintenanceBid'
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
    role: String(payload.role || '').toUpperCase()
  }
}

/**
 * PATCH /api/maintenance/activities/[id]/assign
 * Affecte une offre à une activité (admin uniquement)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { role } = await verifyToken(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    await connectMongoose()
    const body = await request.json()
    const { bidId } = body

    if (!bidId) {
      return NextResponse.json({ error: 'ID de l\'offre requis' }, { status: 400 })
    }

    const activity = await MaintenanceActivity.findById(id)
    if (!activity) {
      return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 })
    }

    const bid = await MaintenanceBid.findById(bidId)
    if (!bid) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    if (String(bid.activityId) !== id) {
      return NextResponse.json({ error: 'L\'offre ne correspond pas à cette activité' }, { status: 400 })
    }

    // Mettre à jour l'activité
    activity.assignedBidId = bid._id
    activity.status = 'assigned'
    await activity.save()

    // Mettre à jour le statut de l'offre
    bid.status = 'accepted'
    await bid.save()

    // Rejeter les autres offres
    await MaintenanceBid.updateMany(
      {
        activityId: activity._id,
        _id: { $ne: bid._id }
      },
      {
        status: 'rejected'
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Offre affectée avec succès',
      activity: {
        id: activity._id.toString(),
        status: activity.status,
        assignedBidId: activity.assignedBidId?.toString()
      }
    })
  } catch (error) {
    console.error('Erreur affectation offre:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

