import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { sendPushToUser } from '@/lib/push'
import { getAppConfig, getOrCreateWallet } from '@/lib/wallet'

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
    const items = await Offer.find(q).sort({ createdAt: -1 }).limit(100).lean()

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
  const rateLimitResponse = applyRateLimit(request, serviceWriteRateLimiter)
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

    // Gate: vérifier solde points suffisant pour une future mission gagnée
    const cfg = await getAppConfig()
    const pointsCost = cfg.monetization.pointsPerWonMission
    if (cfg.monetization.mode === 'points' && pointsCost > 0) {
      const wallet = await getOrCreateWallet(String(userId))
      if (wallet.points < pointsCost) {
        return NextResponse.json(
          { error: `Solde points insuffisant (${wallet.points}/${pointsCost} pts requis pour soumettre une offre)` },
          { status: 402 }
        )
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
    const created = await Offer.create(offerData)
    if (sr.status === 'created') { sr.status = 'pending_offers'; await sr.save() }

    // Notifier le consumer en temps réel
    const io = (global as any).io
    if (io) {
      io.to(`request-${requestId}`).emit('offer:new', {
        offerId: created._id,
        requestId,
        price,
        etaMinutes,
        comment,
        validityMinutes: vm,
        validUntil,
        createdAt: created.createdAt,
      })
      // Notifier le client dans sa room user-{clientId} pour rafraîchir my-requests / home
      io.to(`user-${sr.clientId}`).emit('user:offer-received', {
        requestId,
        offerId: String(created._id),
      })
    }

    // Push notification au consumer (fire & forget)
    void sendPushToUser(String(sr.clientId), {
      title: '💰 Nouvelle offre reçue',
      body: `${price.toLocaleString('fr-FR')} FCFA — ${comment ? comment.slice(0, 60) : 'Voir l\'offre'}`,
      data: { type: 'offer:new', requestId, offerId: String(created._id) },
    })

    return NextResponse.json({ success: true, item: created })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/services/offers]', e)
    return NextResponse.json({ error: 'Erreur création offre' }, { status: 500 })
  }
}
