import { connectMongoose } from './mongoose'
import ServiceRequest from './models/ServiceRequest'
import { sendPushToUser } from './push'
import { archive } from './mission-lifecycle'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export async function runInactivityJob() {
  await connectMongoose()
  const now = new Date()

  const activeStatuses = ['created', 'broadcasted', 'pending_offers', 'accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']

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
