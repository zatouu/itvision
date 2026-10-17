import { sendSms } from '@/lib/sms'
import { MARKET_BRAND } from '@/lib/branding'
import { randomUUID } from 'crypto'
import SourcingRequest from '@/lib/models/SourcingRequest'

const MAX_NOTIFICATION_ATTEMPTS = 3
const NOTIFICATION_LEASE_MS = 5 * 60_000

export function pendingSourcingProposalNotification() {
  return { status: 'pending' as const, attempts: 0, nextAttemptAt: new Date() }
}

export async function deliverSourcingProposalNotification(
  requestId: string,
  send: typeof sendSourcingProposalSms = sendSourcingProposalSms
): Promise<boolean> {
  const now = new Date()
  const leaseId = randomUUID()
  const doc = await SourcingRequest.findOneAndUpdate(
    {
      _id: requestId,
      status: 'proposal_sent',
      'proposal.expiresAt': { $gt: now },
      'proposalNotification.status': { $in: ['pending', 'sending'] },
      'proposalNotification.nextAttemptAt': { $lte: now },
      'proposalNotification.attempts': { $lt: MAX_NOTIFICATION_ATTEMPTS },
    },
    {
      $set: {
        'proposalNotification.status': 'sending',
        'proposalNotification.leaseId': leaseId,
        'proposalNotification.nextAttemptAt': new Date(now.getTime() + NOTIFICATION_LEASE_MS),
      },
      $inc: { 'proposalNotification.attempts': 1 },
    },
    { new: true }
  )
  if (!doc?.proposal || !doc.proposalNotification) return false

  let submitted = false
  try {
    submitted = await send(doc, doc.proposal)
  } catch {
    console.warn('[sourcing] tentative de notification échouée pour', doc.reference)
  }
  const attempts = doc.proposalNotification.attempts
  await SourcingRequest.updateOne(
    { _id: doc._id, 'proposalNotification.leaseId': leaseId, 'proposalNotification.status': 'sending' },
    {
      $set: {
        'proposalNotification.status': submitted ? 'submitted' : attempts >= MAX_NOTIFICATION_ATTEMPTS ? 'failed' : 'pending',
        ...(submitted
          ? { 'proposalNotification.submittedAt': new Date() }
          : { 'proposalNotification.nextAttemptAt': new Date(Date.now() + attempts * 15 * 60_000) }),
      },
      $unset: { 'proposalNotification.leaseId': 1 },
    }
  )
  return submitted
}

export async function retrySourcingProposalNotifications() {
  const now = new Date()
  await SourcingRequest.updateMany(
    {
      'proposalNotification.status': { $in: ['pending', 'sending'] },
      'proposalNotification.nextAttemptAt': { $lte: now },
      $or: [
        { 'proposalNotification.attempts': { $gte: MAX_NOTIFICATION_ATTEMPTS } },
        { 'proposal.expiresAt': { $lte: now } },
        { status: { $ne: 'proposal_sent' } },
      ],
    },
    { $set: { 'proposalNotification.status': 'failed' }, $unset: { 'proposalNotification.leaseId': 1 } }
  )
  const pending = await SourcingRequest.find({
    status: 'proposal_sent',
    'proposal.expiresAt': { $gt: now },
    'proposalNotification.status': { $in: ['pending', 'sending'] },
    'proposalNotification.nextAttemptAt': { $lte: now },
    'proposalNotification.attempts': { $lt: MAX_NOTIFICATION_ATTEMPTS },
  }).select('_id').sort({ 'proposalNotification.nextAttemptAt': 1 }).limit(20).lean()
  for (const request of pending) {
    await deliverSourcingProposalNotification(String(request._id)).catch(() => {
      console.warn('[sourcing] notification à reprendre pour', String(request._id))
    })
  }
}

/** URL publique du site (liens SMS, images envoyées aux modèles de vision). */
export function publicBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || MARKET_BRAND.url).replace(/\/+$/, '')
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${publicBaseUrl()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

/** SMS « proposition prête » envoyé au client — partagé par l'envoi admin et l'envoi automatique de l'agent. */
export async function sendSourcingProposalSms(
  doc: { reference: string; publicToken: string; contactPhone: string },
  proposal: { productName: string; totalClientPrice: number; deliveryDays: number },
  baseUrl = publicBaseUrl()
): Promise<boolean> {
  const trackUrl = `${baseUrl}/market/sourcing/${doc.publicToken}`
  const sms =
    `${MARKET_BRAND.name} — ${doc.reference} : votre proposition est prête. ` +
    `${proposal.productName.slice(0, 40)} — ${Math.round(proposal.totalClientPrice).toLocaleString('fr-FR')} FCFA livré en ${proposal.deliveryDays}j. ` +
    `Valider : ${trackUrl}`
  try {
    const ok = await sendSms(doc.contactPhone, sms)
    if (!ok) console.warn('[sourcing] SMS proposition non envoyé pour', doc.reference)
    return ok
  } catch (err) {
    console.warn('[sourcing] SMS proposition erreur:', err)
    return false
  }
}
