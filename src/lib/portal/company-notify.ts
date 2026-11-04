import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import InAppNotification from '@/lib/models/InAppNotification'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { emitCompanyNotification } from '@/lib/socket-emit'
import { sendWebPushToUser } from '@/lib/push-web'
import { isCompanyRole, memberCapabilities, type CompanyCapability } from '@/lib/company-rights'

export type CompanyNotifyCategory = 'quote' | 'invoice' | 'payment' | 'project' | 'intervention' | 'report' | 'ticket' | 'contract' | 'team'

export interface CompanyNotifyInput {
  companyId: string | mongoose.Types.ObjectId
  category: CompanyNotifyCategory
  type?: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  actionUrl?: string
  /** Droit nécessaire pour voir la notification (ex. 'finance:view' pour une facture). */
  requires?: CompanyCapability
  metadata?: Record<string, unknown>
  push?: boolean
}

/**
 * Entreprise cliente derrière un clientId historique, qui désigne selon les modèles
 * une entreprise (Client) ou un membre (User) : on renvoie l'entreprise, ou null.
 */
export async function resolveClientCompanyId(clientId: unknown): Promise<string | null> {
  const id = String(clientId || '')
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  await connectMongoose()
  if (await Client.exists({ _id: id })) return id
  const user = await User.findById(id).select('companyClientId').lean() as any
  return user?.companyClientId ? String(user.companyClientId) : null
}

/**
 * Notification pour tous les membres habilités d'une entreprise cliente : persistée (cloche du portail),
 * poussée en temps réel (room company-*) et en push web aux membres concernés. Jamais bloquant.
 */
export async function notifyCompany(input: CompanyNotifyInput): Promise<void> {
  const companyId = String(input.companyId || '')
  if (!mongoose.Types.ObjectId.isValid(companyId)) return
  try {
    await connectMongoose()
    const metadata = { ...input.metadata, category: input.category, ...(input.requires ? { requires: input.requires } : {}) }
    const notif = await InAppNotification.create({
      teamId: companyId,
      type: input.type || 'info',
      title: input.title.slice(0, 160),
      message: input.message.slice(0, 500),
      actionUrl: input.actionUrl,
      metadata,
    }) as any

    emitCompanyNotification(companyId, {
      _id: String(notif._id),
      type: notif.type,
      title: notif.title,
      message: notif.message,
      actionUrl: notif.actionUrl,
      metadata,
      createdAt: notif.createdAt,
      readBy: [],
    })

    if (input.push !== false) {
      const members = await User.find({ companyClientId: companyId, isActive: { $ne: false }, companyInvitePending: { $ne: true } })
        .select('_id companyRole companyCapabilities portalNotifyMuted').limit(100).lean() as any[]
      const targets = members.filter(m =>
        !(Array.isArray(m.portalNotifyMuted) && m.portalNotifyMuted.includes(input.category)) &&
        (!input.requires || memberCapabilities(isCompanyRole(m.companyRole) ? m.companyRole : 'owner', m.companyCapabilities).includes(input.requires))
      )
      await Promise.allSettled(targets.map(m => sendWebPushToUser(String(m._id), {
        title: input.title,
        body: input.message,
        url: input.actionUrl || '/portail-entreprise',
        tag: `corp-${input.category}`,
      })))
    }
  } catch (e) {
    console.error('[notifyCompany]', e)
  }
}
