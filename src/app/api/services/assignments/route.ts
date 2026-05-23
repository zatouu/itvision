import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Assignment from '@/lib/models/Assignment'
import Offer from '@/lib/models/Offer'
import { requireAdminApi } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdminApi(request) // côté admin/back-office ou logique serveur (pas exposé public)
    const body = await request.json()
    const { requestId, offerId } = body || {}
    if (!requestId || !offerId) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const offer = await Offer.findById(offerId)
    const sr = await ServiceRequest.findById(requestId)
    if (!offer || !sr) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const assignment = await Assignment.create({ requestId, providerId: offer.providerId, offerId, status: 'accepted', acceptedAt: new Date() })
    sr.status = 'assigned'; sr.assignedProviderId = offer.providerId; sr.selectedOfferId = offer._id; await sr.save()

    return NextResponse.json({ success: true, assignment })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur assignment' }, { status: 500 })
  }
}
