import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { sendPushToUser } from '@/lib/push'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || typeof body.accept !== 'boolean') {
      return NextResponse.json({ error: 'Payload invalide: accept (boolean) requis' }, { status: 400 })
    }
    const { accept } = body as any

    const offer = await Offer.findById(id)
    if (!offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

    if (String(offer.providerId) !== String(userId)) {
      return NextResponse.json({ error: 'Seul l\'auteur de l\'offre peut répondre' }, { status: 403 })
    }

    if (offer.clientCounterStatus !== 'pending') {
      return NextResponse.json({ error: 'Aucune contre-offre en attente' }, { status: 409 })
    }

    const sr = await ServiceRequest.findById(offer.requestId)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const clientId = String(sr.clientId)
    const requestId = String(sr._id)
    const offerId = String(offer._id)

    if (accept) {
      // Le provider accepte la contre-offre : le prix de l'offre devient le prix de la contre-offre
      const oldPrice = offer.price
      offer.price = offer.clientCounterPrice
      offer.clientCounterStatus = 'accepted'
      await offer.save()

      const io = (global as any).io
      if (io) {
        io.to(`request-${requestId}`).emit('offer:counter-accepted', {
          offerId,
          requestId,
          newPrice: offer.price,
          oldPrice,
        })
        io.to(`user-${clientId}`).emit('offer:counter-accepted', {
          offerId,
          requestId,
          newPrice: offer.price,
          oldPrice,
        })
      }

      void sendPushToUser(clientId, {
        title: '✅ Contre-offre acceptée',
        body: `Le prestataire a accepté votre offre de ${offer.price.toLocaleString('fr-FR')} FCFA. Vous pouvez finaliser la mission.`,
        data: { type: 'offer:counter-accepted', offerId, requestId },
      })

      return NextResponse.json({ success: true, accepted: true, offer })
    } else {
      // Le provider refuse la contre-offre
      offer.clientCounterStatus = 'rejected'
      await offer.save()

      const io = (global as any).io
      if (io) {
        io.to(`request-${requestId}`).emit('offer:counter-rejected', {
          offerId,
          requestId,
        })
        io.to(`user-${clientId}`).emit('offer:counter-rejected', {
          offerId,
          requestId,
        })
      }

      void sendPushToUser(clientId, {
        title: '❌ Contre-offre refusée',
        body: `Le prestataire a refusé votre offre de ${offer.clientCounterPrice?.toLocaleString('fr-FR')} FCFA.`,
        data: { type: 'offer:counter-rejected', offerId, requestId },
      })

      return NextResponse.json({ success: true, accepted: false, offer })
    }
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/offers/:id/counter-response]', e)
    return NextResponse.json({ error: 'Erreur réponse contre-offre' }, { status: 500 })
  }
}
