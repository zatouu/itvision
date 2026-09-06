import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import { requireAuth } from '@/lib/jwt'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import { releaseMissionReservation } from '@/lib/wallet'

/**
 * DELETE /api/services/offers/:id — le prestataire retire son offre.
 * Industrie (InDriver/Uber-like) : retrait possible uniquement tant que
 * l'offre est 'submitted' ; la réservation de crédits éventuelle est libérée.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimitRequest(request, { windowMs: 60_000, max: 10, keyPrefix: 'offers:withdraw' })
  if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params

    const offer = await Offer.findById(id)
    if (!offer) {
      return NextResponse.json({ error: 'Offre introuvable', code: 'OFFER_NOT_FOUND' }, { status: 404 })
    }
    if (String(offer.providerId) !== String(userId)) {
      return NextResponse.json({ error: 'Seul le prestataire peut retirer son offre', code: 'FORBIDDEN' }, { status: 403 })
    }
    if (offer.status !== 'submitted') {
      return NextResponse.json(
        { error: `Offre non retirable (statut : ${offer.status})`, code: 'OFFER_NOT_WITHDRAWABLE' },
        { status: 409 }
      )
    }

    offer.status = 'withdrawn'
    await offer.save()

    // Libère la réservation de crédits éventuelle (idempotent)
    try {
      await releaseMissionReservation(String(userId), String(offer.requestId), 'Offre retirée')
    } catch (e) {
      console.error('[offers.withdraw] releaseMissionReservation', e)
    }

    const io = (global as any).io
    if (io) {
      // Rafraîchit l'écran offres du client + la liste « mes offres »
      // du prestataire (événement existant déjà écouté par les apps).
      const payload = {
        offerId: String(offer._id),
        requestId: String(offer.requestId),
        status: 'withdrawn',
      }
      io.to(`request-${String(offer.requestId)}`).emit('offer:updated', payload)
      io.to(`provider-${userId}`).emit('offer:updated', payload)
    }

    return NextResponse.json({ ok: true, status: 'withdrawn' })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[DELETE /api/services/offers/:id]', e)
    return NextResponse.json({ error: 'Erreur retrait offre' }, { status: 500 })
  }
}
