import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { requireAuth } from '@/lib/jwt'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import User from '@/lib/models/User'
import DisputeEvidence from '@/lib/models/DisputeEvidence'
import DisputeMessage from '@/lib/models/DisputeMessage'
import MissionAuditLog from '@/lib/models/MissionAuditLog'

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
      User.findById(sr.clientId).select('name phone avatarUrl kycVerified').lean(),
      sr.assignedProviderId ? User.findById(sr.assignedProviderId).select('name phone avatarUrl').lean() : null,
    ])

    const routeRefreshMinMs = Number(process.env.ROUTE_REFRESH_MIN_MS) >= 1000 ? Number(process.env.ROUTE_REFRESH_MIN_MS) : 60000
    const routeRefetchMinMoveM = Number(process.env.ROUTE_REFETCH_MIN_MOVE_M) >= 10 ? Number(process.env.ROUTE_REFETCH_MIN_MOVE_M) : 250

    const allOffers = await Offer.find({ requestId: id }).lean()
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
      acceptedOffer = allOffers.find((o: any) => String(o._id) === String(sr.selectedOfferId)) || null
      if (acceptedOffer && providerUser) {
        acceptedOffer.providerName = acceptedOffer.providerName || providerUser.name
        acceptedOffer.providerPhone = providerUser.phone
      }
    }
    let payment = null
    if (sr.selectedOfferId) {
      const Payment = (await import('@/lib/models/Payment')).default
      const payments = await Payment.find({ requestId: id, status: { $in: ['pending', 'held', 'released', 'refunded', 'failed'] } })
        .select('status provider phase amount depositAmount balanceAmount useEscrow createdAt').lean()
      if (payments.length > 0) {
        const deposit = payments.find(p => p.phase === 'deposit')
        const balance = payments.find(p => p.phase === 'balance')
        const full = payments.find(p => p.phase === 'full')
        const latest = payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        payment = {
          status: latest.status,
          provider: latest.provider,
          phase: latest.phase,
          amount: latest.amount,
          depositAmount: deposit?.depositAmount || full?.depositAmount || 0,
          balanceAmount: balance?.amount || deposit?.balanceAmount || full?.balanceAmount || 0,
          useEscrow: latest.useEscrow,
          depositStatus: deposit?.status || null,
          balanceStatus: balance?.status || null,
        }
      }
    }

    const hasDispute = sr.status === 'dispute' || sr.disputeStatus || sr.disputeDecision
    const [disputeEvidence, disputeMessages, disputeAudit] = hasDispute
      ? await Promise.all([
          DisputeEvidence.find({ requestId: id }).sort({ createdAt: -1 }).lean(),
          DisputeMessage.find({ requestId: id }).sort({ createdAt: 1 }).lean(),
          MissionAuditLog.find({ requestId: id, action: { $in: ['dispute_opened', 'dispute_resolved', 'payment_released', 'payment_refunded'] } }).sort({ createdAt: -1 }).lean(),
        ])
      : [[], [], []]

    const lifecycle = await import('@/lib/mission-lifecycle')
    const metrics = lifecycle.computeMetrics(sr)
    const display = lifecycle.DISPLAY_LABELS[lifecycle.normalizeStatus(sr.status)]

    // Journal d'état de la mission (transitions + pauses/reprises)
    const statusLogRaw = await MissionAuditLog.find({
      requestId: id,
      action: { $in: ['status_changed', 'pause', 'resume'] },
    }).sort({ createdAt: 1 }).select('action fromStatus toStatus createdAt').lean()
    const statusLog = statusLogRaw.map((e: any) => ({
      timestamp: e.createdAt,
      action: e.action,
      fromStatus: e.fromStatus || null,
      toStatus: e.toStatus || null,
    }))

    // Avis client sur cette mission (s'il existe)
    const ServiceReview = (await import('@/lib/models/ServiceReview')).default
    const reviewDoc = await ServiceReview.findOne({ requestId: id }).select('rating comment createdAt').lean() as any
    const clientReview = reviewDoc ? { rating: reviewDoc.rating, comment: reviewDoc.comment || null, createdAt: reviewDoc.createdAt } : null

    // Gains + compteur hebdomadaire : réservés au prestataire assigné / admin.
    // Pas de commission ni de bonus dans le ledger actuel → net = brut, pas de lignes fictives.
    let earnings = null
    let weeklyCompletedMissions: number | null = null
    if ((isProvider || isAdmin) && sr.assignedProviderId) {
      const price = Number((acceptedOffer as any)?.price)
      if (Number.isFinite(price) && price > 0) {
        earnings = { grossAmountFcfa: price, netAmountFcfa: price }
      }
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      weeklyCompletedMissions = await ServiceRequest.countDocuments({
        assignedProviderId: sr.assignedProviderId,
        status: 'completed',
        completedAt: { $gte: weekAgo },
      })
    }

    return NextResponse.json({ item: {
      ...sr,
      offerCount,
      pendingOfferCount,
      unseenOfferCount,
      acceptedOffer,
      payment,
      clientName: clientUser?.name,
      clientPhone: clientUser?.phone,
      clientAvatar: (clientUser as any)?.avatarUrl || null,
      clientVerified: !!(clientUser as any)?.kycVerified,
      clientValidatedAt: (sr as any).validatedByClientAt || null,
      providerName: providerUser?.name,
      providerPhone: providerUser?.phone,
      providerAvatar: (providerUser as any)?.avatarUrl || null,
      statusLabel: display,
      statusLog,
      clientReview,
      earnings,
      weeklyCompletedMissions,
      routeRefreshMinMs,
      routeRefetchMinMoveM,
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
      disputeEvidence,
      disputeMessages,
      disputeAudit,
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
    const limit = await rateLimitRequest(request, { windowMs: 10_000, max: 5, keyPrefix: 'requests:patch' })
    if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

    await connectMongoose()
    const { userId, role } = await requireAuth(request)
    const { id } = await params
    const sr = await ServiceRequest.findById(id)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role)
    console.log('[PATCH /api/services/requests/:id] auth context', { id, userId, role, missionRoleFallback: MISSION_ROLE_MAP[role] || (isClient ? 'client' : 'provider'), clientId: sr.clientId, assignedProviderId: sr.assignedProviderId, isClient, isProvider, isAdmin, status: sr.status })
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
    const actionCount = [body.status !== undefined, body.action === 'pause', body.action === 'resume', body.action === 'validate', body.action === 'dispute', body.action === 'resolve-dispute'].filter(Boolean).length
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
        return NextResponse.json({ error: err.message || 'Transition interdite', code: err.code || 'TRANSITION_FORBIDDEN' }, { status: 409 })
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

    // ─── Message dans le litige ───
    if (body.action === 'dispute-message') {
      if (!body.text) return NextResponse.json({ error: 'Le message est obligatoire' }, { status: 400 })
      if (!['dispute'].includes(sr.status)) return NextResponse.json({ error: 'La mission n\'est pas en litige' }, { status: 409 })
      await DisputeMessage.create({
        requestId: id,
        senderId: userId,
        senderRole: missionRole,
        text: String(body.text).slice(0, 2000),
      })
      await (await import('@/lib/mission-lifecycle')).touch(id, 'dispute-message', userId)
    }

    // ─── Preuve du litige ───
    if (body.action === 'dispute-evidence') {
      if (!body.url) return NextResponse.json({ error: 'L\'URL de la preuve est obligatoire' }, { status: 400 })
      if (!['dispute'].includes(sr.status)) return NextResponse.json({ error: 'La mission n\'est pas en litige' }, { status: 409 })
      await DisputeEvidence.create({
        requestId: id,
        uploadedBy: userId,
        uploadedByRole: missionRole,
        type: body.type || 'image',
        url: String(body.url),
        title: body.title ? String(body.title).slice(0, 200) : undefined,
        description: body.description ? String(body.description).slice(0, 1000) : undefined,
      })
      await (await import('@/lib/mission-lifecycle')).touch(id, 'dispute-evidence', userId)
    }

    // ─── Résolution du litige (admin) ───
    if (body.action === 'resolve-dispute') {
      if (!isAdmin) return NextResponse.json({ error: 'Seul un administrateur peut résoudre un litige' }, { status: 403 })
      if (!body.decision) return NextResponse.json({ error: 'La décision est obligatoire' }, { status: 400 })
      const lifecycle = await import('@/lib/mission-lifecycle')
      try {
        await lifecycle.resolveDispute(id, body.decision as any, {
          actor: { userId, role: 'admin' },
          refundAmount: body.refundAmount ? Number(body.refundAmount) : undefined,
          adminNote: body.adminNote,
          context,
        })
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Résolution impossible' }, { status: 409 })
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
