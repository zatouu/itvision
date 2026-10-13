import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'
import User from '@/lib/models/User'
import InAppNotification from '@/lib/models/InAppNotification'
import { emitUserNotification } from '@/lib/socket-emit'
import { sendWebPushToUser } from '@/lib/push-web'

interface TechnicianNotifyInput {
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  actionUrl?: string
  metadata?: Record<string, unknown>
}

/** Compte utilisateur derrière une fiche technicien (liaison par email). */
async function technicianUserId(technicianId: unknown): Promise<{ userId: string; push: boolean } | null> {
  const id = String(technicianId || '')
  if (!mongoose.isValidObjectId(id)) return null
  const tech = await Technician.findById(id).select('email preferences').lean() as any
  if (!tech?.email) return null
  const user = await User.findOne({ email: String(tech.email).toLowerCase() }).select('_id').lean() as any
  if (!user?._id) return null
  return { userId: String(user._id), push: tech.preferences?.notifications?.push !== false }
}

/** Notification persistée (cloche), temps réel et push au technicien. Jamais bloquant. */
export async function notifyTechnician(technicianId: unknown, input: TechnicianNotifyInput): Promise<void> {
  try {
    await connectMongoose()
    const target = await technicianUserId(technicianId)
    if (!target) return
    const type = input.type || 'info'
    const actionUrl = input.actionUrl || '/tech-interface'
    await InAppNotification.create({
      userId: target.userId,
      type,
      title: input.title.slice(0, 160),
      message: input.message.slice(0, 500),
      actionUrl,
      metadata: { ...input.metadata, category: 'tech' },
    })
    emitUserNotification(target.userId, { type, title: input.title, message: input.message, data: { ...input.metadata, actionUrl } })
    if (target.push) {
      await sendWebPushToUser(target.userId, { title: input.title, body: input.message, url: actionUrl, tag: 'tech' })
    }
  } catch (e) {
    console.error('[notifyTechnician]', e)
  }
}

type InterventionLike = {
  _id?: unknown
  title?: string
  status?: string
  date?: Date | string
  heureDebut?: string
  site?: string
  technicienId?: unknown
}

const when = (d?: Date | string, time?: string) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const txt = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' })
  return time ? `${txt} à ${time}` : txt
}

/**
 * Prévient le ou les techniciens concernés d'un changement décidé par le planning :
 * affectation, retrait, report, annulation. Les actions du technicien lui-même ne le notifient pas.
 */
export async function notifyTechnicianOfChange(before: InterventionLike | null, after: InterventionLike) {
  const id = String(after._id || '')
  const actionUrl = `/tech-interface?intervention=${id}`
  const title = after.title || 'Intervention'
  const prevTech = before?.technicienId ? String(before.technicienId) : ''
  const nextTech = after.technicienId ? String(after.technicienId) : ''
  const slot = when(after.date, after.heureDebut)
  const place = after.site ? ` · ${after.site}` : ''
  const metadata = { interventionId: id }

  if (prevTech && prevTech !== nextTech) {
    await notifyTechnician(prevTech, { type: 'warning', title: `Intervention retirée : ${title}`, message: 'Elle a été confiée à un autre technicien.', metadata })
  }
  if (!nextTech) return
  if (after.status === 'cancelled') {
    if (before && before.status !== 'cancelled' && prevTech === nextTech) {
      await notifyTechnician(nextTech, { type: 'warning', title: `Intervention annulée : ${title}`, message: slot ? `Prévue ${slot}.` : 'Elle ne figure plus dans votre planning.', actionUrl, metadata })
    }
    return
  }
  if (nextTech !== prevTech) {
    await notifyTechnician(nextTech, { title: `Nouvelle intervention : ${title}`, message: slot ? `Prévue ${slot}${place}.` : `À planifier${place}.`, actionUrl, metadata })
    return
  }
  const moved = !!before && !!after.date && (
    new Date(before.date || 0).getTime() !== new Date(after.date).getTime() || (before.heureDebut || '') !== (after.heureDebut || '')
  )
  if (moved) {
    await notifyTechnician(nextTech, { title: `Intervention reprogrammée : ${title}`, message: slot ? `Désormais ${slot}${place}.` : 'Nouvelle date à confirmer.', actionUrl, metadata })
  }
}
