import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import MaintenanceBid from '@/lib/models/MaintenanceBid'
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
    role: String(payload.role || '').toUpperCase(),
    technicianId: payload.technicianId as string | undefined
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { role } = await verifyToken(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }
    await connectMongoose()
    const bids = await MaintenanceBid.find({ activityId: params.id }).sort({ createdAt: -1 }).lean()

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
    console.error('Erreur récupération offres maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { role, technicianId, userId } = await verifyToken(request)
    if (!['TECHNICIAN', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()
    const activity = await MaintenanceActivity.findById(params.id)
    if (!activity || activity.status !== 'open') {
      return NextResponse.json({ error: 'Activité non disponible' }, { status: 400 })
    }

    const body = await request.json()
    const { amount, availability, message } = body
    if (!amount || !availability) {
      return NextResponse.json({ error: 'Montant et disponibilité requis' }, { status: 400 })
    }

    let techId = technicianId
    let technicianName = 'Technicien'
    let technicianPhone: string | undefined

    if (role === 'TECHNICIAN') {
      const technician = await Technician.findOne({ userId }).lean()
      if (!technician) {
        return NextResponse.json({ error: 'Technicien introuvable' }, { status: 404 })
      }
      techId = technician._id.toString()
      technicianName = technician.name || technician.email || 'Technicien'
      technicianPhone = technician.phone
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
    console.error('Erreur dépôt offre maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

