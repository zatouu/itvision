import mongoose from 'mongoose'
import User from '@/lib/models/User'
import InAppNotification from '@/lib/models/InAppNotification'

const SESSION_GAP_MS = 30 * 60 * 1000

/**
 * Enregistre la visite du tableau de bord et renvoie ce qui s'est passé depuis la visite précédente
 * (une visite = activité séparée de plus de 30 min), à partir des notifications de l'entreprise.
 */
export async function whatsNewSinceLastVisit(opts: { userId: string; companyId: string; can: (cap: string) => boolean }) {
  const now = new Date()
  const user = await User.findById(opts.userId).select('portalSeenAt portalLastSeenAt').lean() as any
  let since: Date | null = user?.portalLastSeenAt ? new Date(user.portalLastSeenAt) : null
  const seen = user?.portalSeenAt ? new Date(user.portalSeenAt) : null
  const newVisit = !seen || now.getTime() - seen.getTime() > SESSION_GAP_MS
  // portalSeenAt suit la dernière activité ; au début d'une nouvelle visite, elle devient la référence « depuis »
  if (newVisit) since = seen
  await User.updateOne({ _id: opts.userId }, { $set: { portalSeenAt: now, ...(newVisit && seen ? { portalLastSeenAt: seen } : {}) } })
  if (!since) return { since: null, items: [] as any[] }

  const docs = await InAppNotification.find({
    createdAt: { $gt: since },
    deletedBy: { $ne: opts.userId },
    $or: [
      { userId: opts.userId },
      ...(mongoose.Types.ObjectId.isValid(opts.companyId) ? [{ teamId: opts.companyId }] : []),
    ],
  }).sort({ createdAt: -1 }).limit(20).select('title message actionUrl createdAt metadata type').lean() as any[]

  const items = docs.filter(n => !n.metadata?.requires || opts.can(n.metadata.requires)).slice(0, 5)
  return { since, items }
}
