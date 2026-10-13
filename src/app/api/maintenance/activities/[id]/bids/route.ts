import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import MaintenanceBid from '@/lib/models/MaintenanceBid'
import Technician from '@/lib/models/Technician'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { resolveTechnicianId } from '@/lib/interventions-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { role } = await requireApiUser(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }
    await connectMongoose()
    const bids = await MaintenanceBid.find({ activityId: id }).sort({ createdAt: -1 }).lean() as any[]

    return NextResponse.json({
      success: true,
      bids: bids.map((bid) => ({
        id: bid._id.toString(),
        amount: bid.amount,
        availability: bid.availability,
        message: bid.message,
        status: bid.status,
        technicianName: bid.technicianName,
        technicianPhone: bid.technicianPhone,
        createdAt: bid.createdAt
      }))
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur récupération offres maintenance:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { role, technicianId, email } = await requireApiUser(request)
    if (!['TECHNICIAN', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()
    const activity = await MaintenanceActivity.findById(id)
    if (!activity || activity.status !== 'open') {
      return NextResponse.json({ error: 'Activité non disponible' }, { status: 400 })
    }

    const body = await request.json()
    const { availability, message } = body
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !availability) {
      return NextResponse.json({ error: 'Montant et disponibilité requis' }, { status: 400 })
    }

    let techId = technicianId
    let technicianName = 'Technicien'
    let technicianPhone: string | undefined

    if (role === 'TECHNICIAN') {
      const ownId = await resolveTechnicianId(email)
      const technician = ownId ? await Technician.findById(ownId).lean() as any : null
      if (!technician) {
        return NextResponse.json({ error: 'Technicien introuvable' }, { status: 404 })
      }
      techId = technician._id.toString()
      technicianName = technician.name || technician.email || 'Technicien'
      technicianPhone = technician.phone
      if (await MaintenanceBid.exists({ activityId: activity._id, technicianId: techId })) {
        return NextResponse.json({ error: 'Vous avez déjà fait une offre sur cette mission' }, { status: 409 })
      }
    } else {
      technicianName = body.technicianName || 'Technicien (admin)'
      technicianPhone = body.technicianPhone
    }

    const bid = await MaintenanceBid.create({
      activityId: activity._id,
      technicianId: techId,
      technicianName,
      technicianPhone,
      amount,
      availability,
      message
    })

    activity.bidsCount += 1
    if (!activity.bestBidAmount || amount < activity.bestBidAmount) {
      activity.bestBidAmount = amount
    }
    await activity.save()

    return NextResponse.json({
      success: true,
      bidId: bid._id.toString()
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur dépôt offre maintenance:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

