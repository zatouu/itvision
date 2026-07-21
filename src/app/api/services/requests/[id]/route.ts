import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import Payment from '@/lib/models/Payment'
import { requireAuth } from '@/lib/jwt'
import { sendPushToUser } from '@/lib/push'
import { closeDispatch } from '@/lib/visibility'
import { creditReferrerOnFirstMission } from '@/lib/referral'
import { getAppConfig, refundEscrowPoints, refundMissionUnlock, releaseMissionReservation, creditCashBalance } from '@/lib/wallet'
import MissionUnlock from '@/lib/models/MissionUnlock'
import User from '@/lib/models/User'
import {
  incrementProviderCompleted,
  penalizeProviderCancellation,
  recordClientCancellation,
  severityFromStatus,
} from '@/lib/provider-stats'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params
    const sr = await ServiceRequest.findById(id).lean() as any
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    if (!isClient && !isProvider) {
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
      payment = await Payment.findOne({ requestId: id, status: { $in: ['pending', 'held', 'released', 'refunded', 'failed'] } })
        .select('status provider phase amount depositAmount balanceAmount useEscrow').lean()
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
      providerName: providerUser?.name,
      providerPhone: providerUser?.phone,
    }})
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/requests/:id]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  created: ['pending_offers', 'cancelled'],
  pending_offers: ['assigned', 'cancelled'],
  assigned: ['provider_arriving', 'in_progress', 'cancelled'],
  provider_arriving: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params
    const sr = await ServiceRequest.findById(id)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    if (!isClient && !isProvider) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    const body = await request.json()
    const allowedClient = ['description', 'budget', 'status']
    const allowedProvider = ['status']

    if (body.status !== undefined) {
      const nextStatus = body.status
      const validNext = VALID_STATUS_TRANSITIONS[sr.status] || []
      if (!validNext.includes(nextStatus)) {
        return NextResponse.json({ error: `Transition invalide: ${sr.status} → ${nextStatus}` }, { status: 409 })
      }
      // Seul le provider peut passer assigned→provider_arriving
      if (sr.status === 'assigned' && nextStatus === 'provider_arriving' && !isProvider) {
        return NextResponse.json({ error: 'Seul le prestataire peut signaler son départ' }, { status: 403 })
      }
      // Seul le provider peut passer assigned/provider_arriving→in_progress
      if ((sr.status === 'assigned' || sr.status === 'provider_arriving') && nextStatus === 'in_progress' && !isProvider) {
        return NextResponse.json({ error: 'Seul le prestataire peut démarrer la mission' }, { status: 403 })
      }
      // Seul le provider peut passer in_progress→completed
      if (sr.status === 'in_progress' && nextStatus === 'completed' && !isProvider) {
        return NextResponse.json({ error: 'Seul le prestataire peut marquer comme terminée' }, { status: 403 })
      }
      // Annulation: client ou provider (avant completed)
      if (nextStatus === 'cancelled' && ['completed', 'cancelled'].includes(sr.status)) {
        return NextResponse.json({ error: 'Mission déjà terminée ou annulée' }, { status: 409 })
      }
      // Restriction: le provider NE PEUT PAS annuler après in_progress (mission démarrée)
      if (nextStatus === 'cancelled' && isProvider && sr.status === 'in_progress') {
        return NextResponse.json({
          error: 'Vous ne pouvez plus annuler une mission déjà démarrée. Contactez le support.'
        }, { status: 403 })
      }

      const prevStatus = sr.status
      sr.status = nextStatus

      // Poser les timestamps de progression
      const now = new Date()
      if (nextStatus === 'assigned') (sr as any).assignedAt = now
      if (nextStatus === 'provider_arriving') (sr as any).providerArrivingAt = now
      if (nextStatus === 'in_progress') (sr as any).startedAt = now
      if (nextStatus === 'completed') {
        (sr as any).completedAt = now
        // Credit referrer if this is the referred user's first completed mission
        void creditReferrerOnFirstMission(String(sr.clientId), 1000)
        // Incrémenter les missions complétées du provider (impact ranking +)
        if (sr.assignedProviderId) {
          void incrementProviderCompleted(String(sr.assignedProviderId))
        }

        // ─── Libération automatique des paiements en escrow ───
        try {
          const heldPayments = await Payment.find({ requestId: id, status: 'held' }).sort({ createdAt: 1 })
          const cfg = await getAppConfig()
          const commissionRate = Number(cfg.monetization?.commissionRate) || 0
          for (const payment of heldPayments) {
            const rawAmount = payment.phase === 'deposit' ? payment.depositAmount : payment.amount
            if (rawAmount <= 0) continue

            const commission = Math.round((rawAmount * commissionRate) / 100)
            const net = rawAmount - commission

            if (payment.provider !== 'cash' && net > 0) {
              await creditCashBalance(String(payment.providerId), net, {
                relatedMissionId: String(id),
                paymentRef: String(payment._id),
                description: `Reversement mission terminée ${payment.phase === 'deposit' ? '(dépôt)' : payment.phase === 'balance' ? '(solde)' : '(total)'}`,
              })
            }

            payment.status = 'released'
            payment.releasedAt = now
            await payment.save()
          }
          if (heldPayments.length && sr.assignedProviderId) {
            void sendPushToUser(String(sr.assignedProviderId), {
              title: 'Paiement reçu',
              body: 'Mission terminée : les fonds ont été crédités sur votre portefeuille.',
              data: { type: 'payment:released', requestId: String(id) },
              appType: 'provider',
            })
          }
        } catch (releaseErr) {
          console.error('[PATCH completed] auto release payments', releaseErr)
        }
      }
      if (nextStatus === 'cancelled') {
        (sr as any).cancelledAt = now
        ;(sr as any).cancelledBy = isProvider ? 'provider' : 'client'
        if (typeof body.cancelReason === 'string') {
          ;(sr as any).cancelReason = body.cancelReason.slice(0, 500)
        }

        // ─── Impact ranking provider ───
        if (sr.assignedProviderId && ['assigned', 'provider_arriving'].includes(prevStatus)) {
          if (isProvider) {
            // Provider annule après avoir accepté → pénalité forte
            const severity = severityFromStatus(prevStatus)
            void penalizeProviderCancellation(String(sr.assignedProviderId), severity)
          } else if (isClient) {
            // Client annule → on enregistre mais pas de pénalité provider
            void recordClientCancellation(String(sr.assignedProviderId))
          }
        }

        // ─── Gestion du deposit / pénalité client ───
        try {
          const heldPayment = await Payment.findOne({ requestId: id, status: 'held' })
          if (heldPayment) {
            // Client annule après provider_arriving → le deposit est conservé comme pénalité
            const clientLateCancellation = isClient && prevStatus === 'provider_arriving'
            if (clientLateCancellation && heldPayment.depositAmount > 0) {
              const cfg = await getAppConfig()
              const commissionRate = Number(cfg.monetization?.commissionRate) || 0
              const rawAmount = heldPayment.depositAmount
              const commission = Math.round((rawAmount * commissionRate) / 100)
              const net = rawAmount - commission

              if (heldPayment.provider !== 'cash' && net > 0) {
                await creditCashBalance(String(heldPayment.providerId), net, {
                  relatedMissionId: String(id),
                  paymentRef: String(heldPayment._id),
                  description: 'Dépôt de garantie suite à annulation tardive client',
                })
              }

              heldPayment.status = 'released'
              heldPayment.releasedAt = now
              await heldPayment.save()
              // Notify provider
              void sendPushToUser(String(sr.assignedProviderId), {
                title: 'Dépôt de garantie reçu',
                body: `${net.toLocaleString('fr-FR')} FCFA crédités sur votre portefeuille suite à l'annulation tardive du client.`,
                data: { type: 'payment:released', requestId: String(id) },
                appType: 'provider',
              })
            } else {
              // Sinon remboursement complet (provider annule ou client annule avant trajet)
              heldPayment.status = 'refunded'
              heldPayment.refundedAt = now
              await heldPayment.save()
              const escrowCost = heldPayment.escrowPointsCharged || 0
              if (escrowCost > 0) {
                await refundEscrowPoints(String(heldPayment.clientId), String(id), escrowCost)
              }
            }
          }
        } catch (refundErr) {
          console.error('[PATCH cancel] auto-refund/release deposit', refundErr)
        }

        // ─── Remboursement des crédits de déblocage ───
        try {
          const activeUnlocks = await MissionUnlock.find({ requestId: id, status: 'active' }).lean()
          const reservations = await MissionUnlock.find({ requestId: id, status: 'reserved' }).lean()
          const cfgDoc = await (await import('@/lib/models/AppConfig')).default.findOne({ key: 'global' }).lean() as any
          const refundWindowMin = cfgDoc?.credits?.refundWindowMinutes ?? 10
          const quickCancel = now.getTime() - (sr.createdAt?.getTime() || 0) <= refundWindowMin * 60 * 1000
          const reason = quickCancel ? 'Annulation rapide du client' : 'Mission annulée'
          for (const u of activeUnlocks as any[]) {
            void refundMissionUnlock(String(u.providerId), id, reason)
          }
          for (const reservation of reservations as any[]) {
            void releaseMissionReservation(String(reservation.providerId), id, reason)
          }
        } catch (unlockRefundErr) {
          console.error('[PATCH cancel] auto-refund mission unlocks', unlockRefundErr)
        }
      }
    }

    if (isClient) {
      for (const key of allowedClient) {
        if (body[key] !== undefined && key !== 'status') (sr as any)[key] = body[key]
      }
    }
    await sr.save()

    // Fermer la diffusion Visibility Engine si la mission n'est plus en attente d'offres
    if (['assigned', 'cancelled', 'completed', 'expired'].includes(sr.status)) {
      void closeDispatch(id, sr.status === 'assigned' ? 'assigned' : sr.status === 'cancelled' ? 'cancelled' : 'completed')
    }

    // Notifier en temps réel
    const io = (global as any).io
    if (io) {
      io.to(`request-${id}`).emit('request:status-changed', { requestId: id, status: sr.status })
      // Notifier aussi la room personnelle du client (centre de notifs in-app hors écran mission)
      if (sr.clientId) {
        io.to(`user-${sr.clientId}`).emit('request:status-changed', { requestId: id, status: sr.status })
      }
      // Aussi notifier la room provider pour rafraîchir my-offers
      if (sr.assignedProviderId) {
        io.to(`provider-${sr.assignedProviderId}`).emit('mission:status-changed', { requestId: id, status: sr.status })
      }
    }

    // Push notifications sur changement de statut
    if (body.status) {
      const statusLabels: Record<string, string> = {
        provider_arriving: '🚗 Le prestataire est en route',
        in_progress: '🛠️ Mission démarrée',
        completed: '✅ Mission terminée',
        cancelled: '❌ Mission annulée',
      }
      const label = statusLabels[sr.status]
      if (label) {
        // Notifier le client si c'est le provider qui change
        if (isProvider && sr.clientId) {
          await sendPushToUser(String(sr.clientId), {
            title: label,
            body: `${sr.category} — votre mission a changé de statut.`,
            data: { type: 'request:status-changed', requestId: id, status: sr.status },
            appType: 'consumer',
          })
        }
        // Notifier le provider si c'est le client qui annule
        if (isClient && sr.assignedProviderId) {
          await sendPushToUser(String(sr.assignedProviderId), {
            title: label,
            body: `Le client a modifié le statut de la mission.`,
            data: { type: 'request:status-changed', requestId: id, status: sr.status },
            appType: 'provider',
          })
        }
      }
    }

    return NextResponse.json({ success: true, item: sr })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[PATCH /api/services/requests/:id]', e)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}
