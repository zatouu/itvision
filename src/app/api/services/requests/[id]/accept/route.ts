import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { getAppConfig } from '@/lib/wallet'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    let body: any
    try { body = await request.json() } catch { body = {} }
    const offerId = body?.offerId
    if (!offerId) return NextResponse.json({ error: 'offerId requis' }, { status: 400 })

    const { id } = await params
    const sr = await ServiceRequest.findById(id)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (String(sr.clientId) !== String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    // Cas idempotent: si le même prestataire a déjà été assigné (ex: timeout client), répondre succès
    if (sr.status === 'assigned' || sr.status === 'in_progress') {
      if (String(sr.selectedOfferId || '') === String(offerId)) {
        return NextResponse.json({ success: true, alreadyAssigned: true, requestId: id })
      }
      return NextResponse.json({ error: 'Prestataire déjà assigné' }, { status: 409 })
    }

    // Une mission clôturée ne peut plus accepter d'offre
    if (sr.status === 'completed' || sr.status === 'cancelled') {
      return NextResponse.json({ error: 'Mission déjà clôturée' }, { status: 409 })
    }

    const offer = await Offer.findById(offerId)
    if (!offer || String(offer.requestId) !== String(id)) {
      return NextResponse.json({ error: 'Offre invalide' }, { status: 404 })
    }
    // Vérifier expiration
    if (offer.validUntil && new Date(offer.validUntil).getTime() < Date.now()) {
      if (offer.status === 'submitted') {
        offer.status = 'expired'
        await offer.save()
      }
      return NextResponse.json({ error: 'Offre expirée' }, { status: 410 })
    }
    if (offer.status !== 'submitted') {
      return NextResponse.json({ error: `Offre non disponible (${offer.status})` }, { status: 409 })
    }

    const cfg = await getAppConfig()
    if (cfg.escrow.enabled && cfg.escrow.mandatory) {
      return NextResponse.json({ error: 'Paiement sécurisé requis pour accepter cette offre' }, { status: 402 })
    }

    const { pointsCharged } = await acceptOfferForRequest({ serviceRequest: sr, offer })

    return NextResponse.json({ success: true, pointsCharged })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/requests/:id/accept]', e)
    return NextResponse.json({ error: 'Erreur acceptation' }, { status: 500 })
  }
}
