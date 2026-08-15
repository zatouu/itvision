import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { sendPushToUser } from '@/lib/push'
import { onOffer } from '@/lib/visibility'
import { getAppConfig, releaseMissionReservation, reserveMissionCredits } from '@/lib/wallet'
import MissionUnlock from '@/lib/models/MissionUnlock'
import { computeUnlockCost } from '@/lib/credit-cost'

const MAX_PRICE = 50_000_000
const MAX_ETA_MINUTES = 10080 // 7 jours
const MAX_COMMENT_LENGTH = 1000

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const mine = searchParams.get('mine')
    const q: any = {}
    if (requestId) q.requestId = requestId
    if (mine === '1') {
      const { userId } = await requireAuth(request)
      q.providerId = userId
    }

    // Exclure les offres "submitted" dont la validité est dépassée sans faire d'écriture en GET
    const now = new Date()
    q.$or = [
      { status: { $ne: 'submitted' } },
      { status: 'submitted', validUntil: { $gte: now } },
    ]

    const items = await Offer.find(q).sort({ updatedAt: -1 }).limit(100).lean()

    // Si c'est la vue "mes offres" du provider, enrichir avec le statut de la mission
    if (mine === '1' && items.length > 0) {
      const requestIds = [...new Set(items.map((o: any) => String(o.requestId)))]
      const requests = await ServiceRequest.find({ _id: { $in: requestIds } }, 'status category').lean()
      const reqMap = new Map(requests.map((r: any) => [String(r._id), r]))
      for (const item of items as any[]) {
        const req = reqMap.get(String(item.requestId))
        if (req) {
          item.requestStatus = req.status
          item.requestCategory = req.category
        }
      }
    }

    return NextResponse.json({ items })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/services/offers]', e)
    return NextResponse.json({ error: 'Erreur liste offres' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResponse = await applyRateLimit(request, serviceWriteRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request) as any
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }
    const { requestId, price, etaMinutes, comment, providerName, validityMinutes } = body as any

    // Validation requestId
    if (!requestId || typeof requestId !== 'string' || requestId.length > 50) {
      return NextResponse.json({ error: 'requestId invalide' }, { status: 400 })
    }
    // Validation price
    if (typeof price !== 'number' || price <= 0 || price > MAX_PRICE || !Number.isFinite(price)) {
      return NextResponse.json({ error: 'Prix invalide (doit être > 0 et ≤ 50 000 000)' }, { status: 400 })
    }
    // Validation etaMinutes
    if (etaMinutes !== undefined && (typeof etaMinutes !== 'number' || etaMinutes < 0 || etaMinutes > MAX_ETA_MINUTES)) {
      return NextResponse.json({ error: 'ETA invalide (max 7 jours)' }, { status: 400 })
    }
    // Validation comment
    if (comment && (typeof comment !== 'string' || comment.length > MAX_COMMENT_LENGTH)) {
      return NextResponse.json({ error: `Commentaire trop long (max ${MAX_COMMENT_LENGTH} car.)` }, { status: 400 })
    }

    const sr = await ServiceRequest.findById(requestId)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    // Prevent client from offering on own request
    if (String(sr.clientId) === String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    // Refuse offers on missions that are no longer open
    if (!['created', 'broadcasted', 'pending_offers'].includes(sr.status)) {
      const code = sr.status === 'cancelled' ? 'ALREADY_CANCELLED' : sr.status === 'completed' ? 'ALREADY_COMPLETED' : sr.status === 'expired' ? 'ALREADY_EXPIRED' : 'REQUEST_NOT_AVAILABLE'
      return NextResponse.json({ error: 'Cette demande n\'est plus ouverte aux offres', code }, { status: 409 })
    }

    const cfg = await getAppConfig()
    const existing = await Offer.findOne({ requestId, providerId: userId })
    let reservedForOffer = false

    if (cfg.credits?.unlockEnabled === true && (!existing || existing.status === 'expired')) {
      const currentReservation = await MissionUnlock.findOne({ requestId, providerId: userId }).lean()
      if (currentReservation?.status !== 'reserved') {
        const cost = await computeUnlockCost({
          requestId,
          category: sr.category,
          budget: sr.budget,
          urgency: sr.attributes?.urgency || 'normal',
          media: sr.media,
        })
        const reservation = await reserveMissionCredits(String(userId), requestId, cost.cost)
        if (!reservation.ok) {
          const error = reservation.reason === 'insufficient'
            ? `Crédits insuffisants (${reservation.balance ?? 0}/${cost.cost} requis pour proposer cette mission)`
            : 'Réservation de crédits impossible pour cette mission'
          return NextResponse.json({ error, code: reservation.reason }, { status: 402 })
        }
        reservedForOffer = true
      }
    }

    // Validité : 5..1440 min, défaut 30
    const vm = Math.max(5, Math.min(1440, Number(validityMinutes) || 30))
    const validUntil = new Date(Date.now() + vm * 60_000)
    const offerData: any = {
      requestId, providerId: userId, price,
      etaMinutes: etaMinutes ? Math.round(etaMinutes) : undefined,
      comment: comment ? comment.slice(0, MAX_COMMENT_LENGTH) : undefined,
      validityMinutes: vm, validUntil,
    }
    if (providerName && typeof providerName === 'string') offerData.providerName = providerName.slice(0, 60)

    // Upsert: si le provider a déjà une offre sur cette demande, on la met à jour
    // au lieu d'en créer une nouvelle (évite les doublons).
    let offer: any
    let isUpdate = false
    if (existing) {
      // Une offre déjà acceptée/refusée/retirée ne peut pas être modifiée
      if (['accepted', 'rejected', 'withdrawn'].includes(existing.status)) {
        return NextResponse.json(
          { error: `Vous avez déjà une offre ${existing.status === 'accepted' ? 'acceptée' : existing.status === 'rejected' ? 'refusée' : 'retirée'} sur cette demande` },
          { status: 409 }
        )
      }
      isUpdate = true
      existing.price = offerData.price
      existing.etaMinutes = offerData.etaMinutes
      existing.comment = offerData.comment
      existing.validityMinutes = offerData.validityMinutes
      existing.validUntil = offerData.validUntil
      if (offerData.providerName) existing.providerName = offerData.providerName
      // Remettre le statut à submitted si l'offre avait expiré
      if (existing.status === 'expired') existing.status = 'submitted'
      await existing.save()
      offer = existing
    } else {
      try {
        offer = await Offer.create(offerData)
      } catch (offerError) {
        if (reservedForOffer) {
          await releaseMissionReservation(String(userId), requestId, 'Échec de création de l’offre')
        }
        throw offerError
      }
    }
    const created = offer
    if (sr.status === 'created') {
      const lifecycle = await import('@/lib/mission-lifecycle')
      await lifecycle.transition(String(sr._id), 'broadcasted', {
        actor: { userId, role: 'provider' },
        metadata: { source: 'first-offer' },
      })
    } else {
      const lifecycle = await import('@/lib/mission-lifecycle')
      lifecycle.touch(String(sr._id), 'offer', userId).catch(() => {})
    }

    if (cfg.credits?.unlockEnabled === true) {
      await MissionUnlock.updateOne(
        { requestId, providerId: userId, status: 'reserved' },
        { $set: { offerSentAt: new Date() } }
      )
    }

    // Notifier le consumer en temps réel
    const io = (global as any).io
    if (io) {
      io.to(`request-${requestId}`).emit(isUpdate ? 'offer:updated' : 'offer:new', {
        offerId: String(created._id),
        requestId,
        price,
        etaMinutes,
        comment,
        validityMinutes: vm,
        validUntil,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      })
      // Notifier le client dans sa room user-{clientId} pour rafraîchir my-requests / home
      io.to(`user-${sr.clientId}`).emit('user:offer-received', {
        requestId,
        offerId: String(created._id),
      })
    }

    // Push notification au consumer (fire-and-forget, ne pas bloquer la réponse HTTP)
    void sendPushToUser(String(sr.clientId), {
      title: isUpdate ? '💰 Offre mise à jour' : '💰 Nouvelle offre reçue',
      body: `${price.toLocaleString('fr-FR')} FCFA — ${comment ? comment.slice(0, 60) : 'Voir l\'offre'}`,
      data: { type: 'offer:new', requestId, offerId: String(created._id) },
      appType: 'consumer',
    })

    // Notifier le Visibility Engine qu'une offre a été reçue (arrête l'escalade)
    if (!isUpdate) {
      void onOffer(requestId)
    }

    return NextResponse.json({ success: true, item: created })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/services/offers]', e)
    return NextResponse.json({ error: 'Erreur création offre' }, { status: 500 })
  }
}
