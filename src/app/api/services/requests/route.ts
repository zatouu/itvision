import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { enqueueDispatch } from '@/lib/visibility'
import { getActiveCategorySlugs } from '@/lib/service-categories'

const MAX_DESCRIPTION_LENGTH = 2000
const MAX_BUDGET = 10_000_000
const REQUEST_TTL_HOURS = 2 // une demande non assignée expire après 2h

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const mine = searchParams.get('mine')
    const includeArchived = searchParams.get('includeArchived') === '1'
    const now = new Date()
    const q: any = {}
    if (status) {
      q.status = status
    } else {
      const legacyCutoff = new Date(now.getTime() - REQUEST_TTL_HOURS * 60 * 60 * 1000)
      const excludeStatuses = includeArchived ? ['expired'] : ['expired', 'archived']
      q.$and = [
        { status: { $nin: excludeStatuses } },
        {
          $or: [
            { status: { $nin: ['created', 'broadcasted', 'pending_offers'] } },
            { expiresAt: { $gte: now } },
            { expiresAt: { $exists: false }, createdAt: { $gte: legacyCutoff } },
          ],
        },
      ]
    }
    if (mine === '1') {
      const { userId } = await requireAuth(request)
      q.clientId = userId
    }

    const items = await ServiceRequest.find(q).sort({ createdAt: -1 }).limit(100).lean()

    // Enrichir avec offerCount / pendingOfferCount / unseenOfferCount
    if (items.length > 0) {
      const ids = items.map((i: any) => i._id)
      const offers = await Offer.find({ requestId: { $in: ids } }).select('requestId status createdAt updatedAt').lean()
      const countsByRequest = new Map<string, { total: number; pending: number; unseen: number }>()
      for (const item of items as any[]) {
        countsByRequest.set(String(item._id), { total: 0, pending: 0, unseen: 0 })
      }
      for (const offer of offers as any[]) {
        const reqId = String(offer.requestId)
        const entry = countsByRequest.get(reqId)
        if (!entry) continue
        entry.total++
        if (offer.status === 'submitted') {
          entry.pending++
          const readAt = (items as any[]).find((it: any) => String(it._id) === reqId)?.clientOffersReadAt
          const offerUpdatedAt = offer.updatedAt || offer.createdAt
          if (!readAt || (offerUpdatedAt && new Date(offerUpdatedAt).getTime() > new Date(readAt).getTime())) {
            entry.unseen++
          }
        }
      }
      const enriched = items.map((item: any) => {
        const c = countsByRequest.get(String(item._id)) || { total: 0, pending: 0, unseen: 0 }
        return { ...item, offerCount: c.total, pendingOfferCount: c.pending, unseenOfferCount: c.unseen }
      })
      return NextResponse.json({ items: enriched })
    }

    return NextResponse.json({ items })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[GET /api/services/requests]', e)
    return NextResponse.json({ error: 'Erreur liste demandes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResponse = await applyRateLimit(request, serviceWriteRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }
    const { category, description, media, location, budget, channel, attributes } = body as any

    // Validation catégorie
    const validCategories = await getActiveCategorySlugs()
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
    }
    // Validation description
    if (description && (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH)) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_DESCRIPTION_LENGTH} car.)` }, { status: 400 })
    }
    // Validation location
    if (!location?.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return NextResponse.json({ error: 'Coordonnées manquantes ou invalides' }, { status: 400 })
    }
    const [lng, lat] = location.coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number' || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return NextResponse.json({ error: 'Coordonnées hors limites' }, { status: 400 })
    }
    // Validation budget
    const safeBudget = Number.isFinite(Number(budget)) && Number(budget) >= 0 ? Math.min(Number(budget), MAX_BUDGET) : undefined
    // Validation media
    const safeMedia = Array.isArray(media) ? media.filter((m: any) => m && typeof m.url === 'string').slice(0, 10) : []
    // Validation channel
    const safeChannel = ['web', 'mobile', 'callcenter'].includes(channel) ? channel : 'mobile'
    // Validation attributes
    const safeAttributes = attributes && typeof attributes === 'object' && !Array.isArray(attributes)
      ? Object.fromEntries(Object.entries(attributes).filter(([k, v]) => typeof k === 'string' && v !== undefined))
      : {}

    const expiresAt = new Date(Date.now() + REQUEST_TTL_HOURS * 60 * 60 * 1000)
    const created = await ServiceRequest.create({
      clientId: userId, category,
      description: (description || '').slice(0, MAX_DESCRIPTION_LENGTH),
      media: safeMedia, location, budget: safeBudget, channel: safeChannel,
      attributes: safeAttributes,
      expiresAt,
    })

    // Diffusion via le Visibility Engine + Visibility Scheduler (vague immédiate
    // puis escalade progressive du rayon si pas d'offre). Fire-and-forget : ne
    // bloque pas la réponse au client.
    enqueueDispatch(String(created._id)).catch(err => {
      console.error('[POST /api/services/requests] enqueueDispatch failed:', err?.message)
    })

    return NextResponse.json({ success: true, item: created })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/services/requests]', e)
    return NextResponse.json({ error: 'Erreur création demande' }, { status: 500 })
  }
}
