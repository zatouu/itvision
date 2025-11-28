import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import MaintenanceBid from '@/lib/models/MaintenanceBid'
import Technician from '@/lib/models/Technician'
import { jwtVerify } from 'jose'

type RouteContext = { params: Promise<{ id: string }> }

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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { role } = await verifyToken(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }
    await connectMongoose()
    const bids = await MaintenanceBid.find({ activityId: id }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({
      success: true,
      bids: bids.map((bid) => {
        const doc = bid as Record<string, any>
        return {
          id: doc._id?.toString?.() || '',
          amount: doc.amount,
          availability: doc.availability,
          message: doc.message,
          status: doc.status,
          technicianName: doc.technicianName,
          technicianPhone: doc.technicianPhone,
          createdAt: doc.createdAt
        }
      })
    })
  } catch (error) {
    console.error('Erreur récupération offres maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { role, technicianId, userId } = await verifyToken(request)
    if (!['TECHNICIAN', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()
    const activity = await MaintenanceActivity.findById(id)
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
      const technicianRecord = technician && !Array.isArray(technician) ? (technician as Record<string, any>) : null
      if (!technicianRecord) {
        return NextResponse.json({ error: 'Technicien introuvable' }, { status: 404 })
      }
      techId = technicianRecord._id?.toString?.() || undefined
      technicianName = technicianRecord.name || technicianRecord.email || 'Technicien'
      technicianPhone = technicianRecord.phone
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

