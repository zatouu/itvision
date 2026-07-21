import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { requireAuth } from '@/lib/jwt'
import User from '@/lib/models/User'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const { id } = await params
    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    const [clientUser, providerUser] = await Promise.all([
      User.findById(sr.clientId).select('name phone').lean(),
      sr.assignedProviderId ? User.findById(sr.assignedProviderId).select('name phone').lean() : null,
    ])

    const allOffers = await Offer.find({ requestId: id }).select('status createdAt updatedAt').lean()
    const offerCount = allOffers.length
    const pendingOfferCount = allOffers.filter((o: any) => o.status === 'submitted').length
    const readAt = (sr as any).clientOffersReadAt
    const unseenOfferCount = allOffers.filter((o: any) => {
      if (o.status !== 'submitted') return false
      const offerUpdatedAt = (o as any).updatedAt || o.createdAt
      return !readAt || (offerUpdatedAt && new Date(offerUpdatedAt).getTime() > new Date(readAt).getTime())
    }).length
    let acceptedOffer = null
    if (sr.selectedOfferId) {
      acceptedOffer = await Offer.findById(sr.selectedOfferId).lean() as any
      if (acceptedOffer && providerUser) {
        acceptedOffer.providerName = acceptedOffer.providerName || providerUser.name
        acceptedOffer.providerPhone = providerUser.phone
      }
    }
    let payment = null
    if (sr.selectedOfferId) {
      const Payment = (await import('@/lib/models/Payment')).default
      payment = await Payment.findOne({ requestId: id, status: { $in: ['pending', 'held', 'released', 'refunded', 'failed'] } })
        .select('status provider phase amount depositAmount balanceAmount useEscrow').lean()
    }
    const lifecycle = await import('@/lib/mission-lifecycle')
    const metrics = lifecycle.computeMetrics(sr)
    const display = lifecycle.DISPLAY_LABELS[lifecycle.normalizeStatus(sr.status)]
    return NextResponse.json({ item: {
      ...sr,
      offerCount,
      pendingOfferCount,
      unseenOfferCount,
      acceptedOffer,
      payment,
      clientName: clientUser?.name,
      clientPhone: clientUser?.phone,
      providerName: providerUser?.name,
      providerPhone: providerUser?.phone,
      statusLabel: display,
      metrics: {
        ...metrics,
        elapsedFormatted: lifecycle.formatDuration(metrics.elapsedMs),
        activeFormatted: lifecycle.formatDuration(metrics.activeMs),
        pausedFormatted: lifecycle.formatDuration(metrics.pausedMs),
        lastActivityAgo: lifecycle.formatDuration(Date.now() - new Date(metrics.lastActivityAt).getTime()),
        anomalyFlags: sr.anomalyFlags || [],
        anomalyScore: sr.anomalyScore || 0,
      },
      escrowLocked: !!sr.escrowLocked,
    }})
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/requests/:id]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

const MISSION_ROLE_MAP: Record<string, 'client' | 'provider' | 'admin'> = {
  CLIENT: 'client',
  PROVIDER: 'provider',
  ADMIN: 'admin',
  TECHNICIAN: 'admin',
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const { id } = await params
    const sr = await ServiceRequest.findById(id)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    const body = await request.json()
    const missionRole = isAdmin ? 'admin' : (MISSION_ROLE_MAP[role] || (isClient ? 'client' : 'provider'))
    const context = {
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      platform: body.platform as string | undefined,
    }

    // Une seule action métier par requête
    const actionCount = [body.status !== undefined, body.action === 'pause', body.action === 'resume', body.action === 'validate', body.action === 'dispute'].filter(Boolean).length
    if (actionCount > 1) {
      return NextResponse.json({ error: 'Une seule action à la fois' }, { status: 400 })
    }

    // ─── Changement de statut via le Mission Lifecycle Manager ───
    if (body.status !== undefined) {
      const lifecycle = await import('@/lib/mission-lifecycle')
      try {
        await lifecycle.transition(id, body.status, {
          actor: { userId, role: missionRole },
          reason: body.cancelReason || body.reason,
          context,
        })
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Transition interdite' }, { status: 409 })
      }
    }

    // ─── Mise en pause ───
    if (body.action === 'pause') {
      if (!body.reason) return NextResponse.json({ error: 'La raison de la pause est obligatoire' }, { status: 400 })
      const lifecycle = await import('@/lib/mission-lifecycle')
      try {
        await lifecycle.pause(id, {
          actor: { userId, role: missionRole },
          reason: body.reason,
          comment: body.comment,
          estimatedResumeAt: body.estimatedResumeAt,
          context,
        })
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Pause impossible' }, { status: 409 })
      }
    }

    // ─── Reprise ───
    if (body.action === 'resume') {
      const lifecycle = await import('@/lib/mission-lifecycle')
      try {
        await lifecycle.resume(id, { userId, role: missionRole }, context)
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Reprise impossible' }, { status: 409 })
      }
    }

    // ─── Validation client de la fin de mission ───
    if (body.action === 'validate') {
      if (!isClient && !isAdmin) return NextResponse.json({ error: 'Seul le client peut valider' }, { status: 403 })
      const lifecycle = await import('@/lib/mission-lifecycle')
      try {
        await lifecycle.validateCompletion(id, { userId, role: isAdmin ? 'admin' : 'client' }, context)
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Validation impossible' }, { status: 409 })
      }
    }

    // ─── Litige ───
    if (body.action === 'dispute') {
      if (!body.reason) return NextResponse.json({ error: 'Le motif du litige est obligatoire' }, { status: 400 })
      const lifecycle = await import('@/lib/mission-lifecycle')
      try {
        await lifecycle.openDispute(id, body.reason, { userId, role: missionRole }, context)
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Litige impossible' }, { status: 409 })
      }
    }

    // ─── Mises à jour de champs autorisés (client) ───
    const allowedClient = ['description', 'budget']
    if (isClient) {
      for (const key of allowedClient) {
        if (body[key] !== undefined) (sr as any)[key] = body[key]
      }
      if (body.media !== undefined && Array.isArray(body.media)) {
        (sr as any).media = body.media.filter((m: any) => m && typeof m.url === 'string').slice(0, 10)
      }
      await sr.save()
      await (await import('@/lib/mission-lifecycle')).touch(id, 'client-update', userId)
    }

    // Recharger le document pour retourner l'état frais
    const fresh = await ServiceRequest.findById(id).lean()
    return NextResponse.json({ success: true, item: fresh })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[PATCH /api/services/requests/:id]', e)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}
