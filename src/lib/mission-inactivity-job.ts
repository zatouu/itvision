import { connectMongoose } from './mongoose'
import ServiceRequest from './models/ServiceRequest'
import Offer from './models/Offer'
import MissionUnlock from './models/MissionUnlock'
import { sendPushToUser } from './push'
import Payment from './models/Payment'
import { archive, expire, validateCompletion } from './mission-lifecycle'
import { releaseMissionReservation } from './wallet'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export async function runInactivityJob() {
  await connectMongoose()
  const now = new Date()

  // awaiting_validation est traité par autoValidateCompletedMissions (règle
  // cash/escrow dédiée) — pas de relance « mission inactive » en doublon.
  const activeStatuses = ['created', 'broadcasted', 'pending_offers', 'accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'dispute']

  // Expiration automatique des demandes non acceptées dont expiresAt est dépassé
  await expireOldRequests(now)
  await expireOldOffers(now)
  await autoValidateCompletedMissions(now)

  const missions = await ServiceRequest.find({
    status: { $in: activeStatuses },
  }).lean() as any[]

  let archivedCount = 0
  let notifiedCount = 0

  for (const mission of missions) {
    const lastActivity = new Date(mission.lastActivityAt || mission.createdAt).getTime()
    const inactiveMs = now.getTime() - lastActivity
    const requestId = String(mission._id)
    const reminderCount = mission.inactivityReminderCount || 0
    const lastReminderAt = mission.inactivityReminderAt ? new Date(mission.inactivityReminderAt).getTime() : 0

    try {
      // 30 jours sans activité → archivage
      if (inactiveMs >= 30 * DAY) {
        await archive(requestId, 'inactivity', { userId: 'system', role: 'system' })
        archivedCount++
        continue
      }

      // 24h première relance
      if (inactiveMs >= 1 * DAY && reminderCount < 1) {
        await sendInactivityReminder(mission, 'Votre mission semble inactive. Est-elle toujours en cours ?')
        await ServiceRequest.findByIdAndUpdate(requestId, {
          $set: { inactivityReminderAt: now, inactivityReminderCount: 1 },
        })
        notifiedCount++
        continue
      }

      // 72h deuxième relance
      if (inactiveMs >= 3 * DAY && reminderCount < 2 && now.getTime() - lastReminderAt >= 1 * DAY) {
        await sendInactivityReminder(mission, 'Relance : votre mission attend toujours une action.')
        await ServiceRequest.findByIdAndUpdate(requestId, {
          $set: { inactivityReminderAt: now, inactivityReminderCount: 2 },
        })
        notifiedCount++
        continue
      }

      // 7 jours badge orange (pas de push répété, seulement mise à jour du badge si besoin)
      if (inactiveMs >= 7 * DAY && reminderCount < 3 && now.getTime() - lastReminderAt >= 1 * DAY) {
        await sendInactivityReminder(mission, 'Mission inactive depuis 7 jours. Elle sera bientôt archivée.')
        await ServiceRequest.findByIdAndUpdate(requestId, {
          $set: { inactivityReminderAt: now, inactivityReminderCount: 3 },
        })
        notifiedCount++
      }
    } catch (err) {
      console.error('[runInactivityJob] error for mission', requestId, err)
    }
  }

  console.log(`[InactivityJob] processed=${missions.length} archived=${archivedCount} notified=${notifiedCount}`)
  return { processed: missions.length, archived: archivedCount, notified: notifiedCount }
}

async function expireOldRequests(now: Date) {
  const expired = await ServiceRequest.find({
    status: { $in: ['created', 'broadcasted', 'pending_offers'] },
    $or: [
      { expiresAt: { $lte: now } },
      { createdAt: { $lte: new Date(now.getTime() - 2 * HOUR) }, expiresAt: { $exists: false } },
    ],
  }).select('_id').lean() as any[]

  if (expired.length === 0) return

  for (const m of expired) {
    try {
      await expire(String(m._id))
    } catch (err) {
      console.error('[expireOldRequests]', String(m._id), err)
    }
  }

  const expiredIds = expired.map((m) => m._id)
  const reservations = await MissionUnlock.find({
    requestId: { $in: expiredIds },
    status: 'reserved',
  }).select('requestId providerId').lean() as any[]

  for (const reservation of reservations) {
    try {
      await releaseMissionReservation(String(reservation.providerId), String(reservation.requestId), 'Mission expirée')
    } catch (err) {
      console.error('[expireOldRequests] releaseMissionReservation', String(reservation._id), err)
    }
  }
}

export async function expireOldOffers(now: Date) {
  const expired = await Offer.find({
    status: 'submitted',
    validUntil: { $lte: now },
  }).select('_id requestId providerId').lean() as any[]

  if (expired.length === 0) return

  await Offer.updateMany(
    { _id: { $in: expired.map((o) => o._id) } },
    { $set: { status: 'expired' } }
  )

  for (const offer of expired) {
    try {
      await releaseMissionReservation(String(offer.providerId), String(offer.requestId), 'Offre expirée')
    } catch (err) {
      console.error('[expireOldOffers] releaseMissionReservation', String(offer._id), err)
    }
  }
}

/**
 * Validation automatique des missions terminées par le prestataire mais non
 * validées par le client (statut awaiting_validation).
 *
 * - Paiement escrow mobile (Wave/OM/Free non libéré) : avertissements à J+1
 *   et J+2, validation à J+3 → libération du paiement au prestataire. Le
 *   client peut ouvrir un litige avant l'échéance (verrouille l'escrow).
 * - Cash / aucun paiement séquestré : rien à protéger → avertissement à
 *   12h, validation à 24h.
 *
 * Chaque échéance exige que les avertissements aient été envoyés et qu'un
 * délai minimal se soit écoulé depuis le dernier : une mission déjà ancienne
 * (au 1er passage) laisse toujours au client un préavis réel.
 */
const AUTO_VALIDATION_RULES = {
  escrow: { warnAt: [1 * DAY, 2 * DAY], validateAt: 3 * DAY, minGapMs: 12 * HOUR },
  cash: { warnAt: [12 * HOUR], validateAt: 1 * DAY, minGapMs: 12 * HOUR },
} as const

export async function autoValidateCompletedMissions(now: Date = new Date()) {
  const missions = await ServiceRequest.find({ status: 'awaiting_validation', escrowLocked: { $ne: true } })
    .select('_id clientId assignedProviderId providerCompletedAt lastActivityAt updatedAt autoValidationWarnCount autoValidationWarnAt')
    .lean() as any[]

  let warned = 0
  let validated = 0

  for (const m of missions) {
    const requestId = String(m._id)
    try {
      const escrowHeld = await Payment.exists({ requestId: m._id, status: 'held', provider: { $ne: 'cash' } })
      const rule = escrowHeld ? AUTO_VALIDATION_RULES.escrow : AUTO_VALIDATION_RULES.cash
      const since = new Date(m.providerCompletedAt || m.lastActivityAt || m.updatedAt).getTime()
      const elapsed = now.getTime() - since
      const warnCount = m.autoValidationWarnCount || 0
      const lastWarnAt = m.autoValidationWarnAt ? new Date(m.autoValidationWarnAt).getTime() : 0
      const gapOk = now.getTime() - lastWarnAt >= rule.minGapMs

      if (elapsed >= rule.validateAt && warnCount >= rule.warnAt.length && gapOk) {
        await validateCompletion(requestId, { userId: 'system', role: 'system' })
        validated++
        if (m.clientId) {
          void sendPushToUser(String(m.clientId), {
            title: 'Mission validée automatiquement',
            body: escrowHeld
              ? 'Sans retour de votre part, la mission a été validée et le paiement versé au prestataire.'
              : 'Sans retour de votre part, la mission a été validée automatiquement.',
            data: { type: 'request:status-changed', requestId, status: 'completed' },
            appType: 'consumer',
          })
        }
        continue
      }

      const nextWarn = rule.warnAt[warnCount]
      if (nextWarn !== undefined && elapsed >= nextWarn && (warnCount === 0 || gapOk)) {
        const isLast = warnCount === rule.warnAt.length - 1
        if (m.clientId) {
          void sendPushToUser(String(m.clientId), {
            title: 'Validez votre mission',
            body: escrowHeld
              ? (isLast
                ? 'Dernier rappel : sans validation ni litige, le paiement sera versé au prestataire sous 24h.'
                : 'Le prestataire a terminé. Validez la mission, ou ouvrez un litige en cas de problème, avant le versement automatique du paiement.')
              : 'Le prestataire a terminé. Sans retour de votre part, la mission sera validée automatiquement sous 12h.',
            data: { type: 'request:status-changed', requestId, status: 'awaiting_validation' },
            appType: 'consumer',
          })
        }
        await ServiceRequest.updateOne(
          { _id: m._id },
          { $set: { autoValidationWarnCount: warnCount + 1, autoValidationWarnAt: now } }
        )
        warned++
      }
    } catch (err) {
      console.error('[autoValidateCompletedMissions]', requestId, err)
    }
  }

  if (warned || validated) console.log(`[AutoValidation] warned=${warned} validated=${validated}`)
  return { warned, validated }
}

async function sendInactivityReminder(mission: any, body: string) {
  const requestId = String(mission._id)
  const title = 'Mission inactive'
  const data = { type: 'mission:inactive', requestId }
  if (mission.clientId) {
    void sendPushToUser(String(mission.clientId), { title, body, data, appType: 'consumer' })
  }
  if (mission.assignedProviderId) {
    void sendPushToUser(String(mission.assignedProviderId), { title, body, data, appType: 'provider' })
  }
}
