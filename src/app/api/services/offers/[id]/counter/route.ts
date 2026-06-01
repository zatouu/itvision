import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { sendPushToUser } from '@/lib/push'

const MAX_COMMENT_LENGTH = 500
const MAX_PRICE = 50_000_000

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }
    const { price, comment } = body as any

    if (typeof price !== 'number' || price <= 0 || price > MAX_PRICE || !Number.isFinite(price)) {
      return NextResponse.json({ error: 'Prix invalide (doit être > 0)' }, { status: 400 })
    }
    if (comment && (typeof comment !== 'string' || comment.length > MAX_COMMENT_LENGTH)) {
      return NextResponse.json({ error: `Commentaire trop long (max ${MAX_COMMENT_LENGTH} car.)` }, { status: 400 })
    }

    const offer = await Offer.findById(id)
    if (!offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

    const sr = await ServiceRequest.findById(offer.requestId)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (String(sr.clientId) !== String(userId)) {
      return NextResponse.json({ error: 'Seul le client peut faire une contre-offre' }, { status: 403 })
    }

    if (offer.status !== 'submitted') {
      return NextResponse.json({ error: `Offre non négociable (${offer.status})` }, { status: 409 })
    }
    if (offer.validUntil && new Date(offer.validUntil).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Offre expirée' }, { status: 410 })
    }

    offer.clientCounterPrice = price
    offer.clientCounterAt = new Date()
    offer.clientCounterComment = comment ? comment.slice(0, MAX_COMMENT_LENGTH) : undefined
    offer.clientCounterStatus = 'pending'
    await offer.save()

    // WebSocket temps réel au provider
    const io = (global as any).io
    if (io) {
      io.to(`provider-${offer.providerId}`).emit('offer:counter', {
        offerId: String(offer._id),
        requestId: String(offer.requestId),
        clientCounterPrice: price,
        clientCounterComment: offer.clientCounterComment,
      })
      io.to(`request-${String(offer.requestId)}`).emit('offer:updated', {
        offerId: String(offer._id),
        clientCounterPrice: price,
        clientCounterStatus: 'pending',
      })
    }

    // Push notification au provider
    void sendPushToUser(String(offer.providerId), {
      title: '💬 Contre-offre reçue',
      body: `Le client propose ${price.toLocaleString('fr-FR')} FCFA au lieu de ${offer.price.toLocaleString('fr-FR')} FCFA`,
      data: { type: 'offer:counter', offerId: String(offer._id), requestId: String(offer.requestId) },
    })

    return NextResponse.json({ success: true, offer })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/offers/:id/counter]', e)
    return NextResponse.json({ error: 'Erreur contre-offre' }, { status: 500 })
  }
}
