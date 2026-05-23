import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const q: any = {}
    if (requestId) q.requestId = requestId
    const items = await Offer.find(q).sort({ createdAt: -1 }).limit(100)
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur liste offres' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const body = await request.json()
    const { requestId, price, etaMinutes, comment } = body || {}
    if (!requestId || typeof price !== 'number') return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    const sr = await ServiceRequest.findById(requestId)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    const created = await Offer.create({ requestId, providerId: userId, price, etaMinutes, comment })
    if (sr.status === 'created') { sr.status = 'pending_offers'; await sr.save() }
    return NextResponse.json({ success: true, item: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création offre' }, { status: 500 })
  }
}
