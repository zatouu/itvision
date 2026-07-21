import mongoose from 'mongoose'
import ServiceRequest from './models/ServiceRequest'
import Payment from './models/Payment'
import {
  getAppConfig,
  creditCashBalance,
  refundEscrowPoints,
} from './wallet'
import { sendPushToUser } from './push'
import {
  incrementProviderCompleted,
  penalizeProviderCancellation,
  recordClientCancellation,
  severityFromStatus,
} from './provider-stats'
import { closeDispatch } from './visibility'

export type MissionRole = 'client' | 'provider' | 'admin' | 'system'

export type MissionStatus =
  | 'created'
  | 'broadcasted'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'paused'
  | 'awaiting_validation'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'dispute'
  | 'archived'

const STATUS_ALIASES: Record<string, MissionStatus> = {
  pending_offers: 'broadcasted',
  assigned: 'accepted',
  provider_arriving: 'on_the_way',
}

export function normalizeStatus(raw: string): MissionStatus {
  return (STATUS_ALIASES[raw] || raw) as MissionStatus
}

export const MISSION_STATUSES: string[] = [
  'created',
  'broadcasted',
  'accepted',
  'on_the_way',
  'arrived',
  'in_progress',
  'paused',
  'awaiting_validation',
  'completed',
  'cancelled',
  'expired',
  'dispute',
  'archived',
  'pending_offers',
  'assigned',
  'provider_arriving',
]

export const DISPLAY_LABELS: Record<MissionStatus, string> = {
  created: 'Créée',
  broadcasted: 'Diffusée',
  accepted: 'Acceptée',
  on_the_way: 'En route',
  arrived: 'Arrivé',
  in_progress: 'En cours',
  paused: 'En pause',
  awaiting_validation: 'Validation en attente',
  completed: 'Terminée',
  cancelled: 'Annulée',
  expired: 'Expirée',
  dispute: 'Litige',
  archived: 'Archivée',
}

export const STATUS_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  created: ['broadcasted', 'cancelled', 'expired'],
  broadcasted: ['accepted', 'cancelled', 'expired'],
  accepted: ['on_the_way', 'cancelled', 'dispute'],
  on_the_way: ['arrived', 'cancelled', 'dispute'],
  arrived: ['in_progress', 'paused', 'cancelled', 'dispute'],
  in_progress: ['paused', 'awaiting_validation', 'completed', 'cancelled', 'dispute'],
  paused: ['in_progress', 'awaiting_validation', 'completed', 'cancelled', 'dispute'],
  awaiting_validation: ['completed', 'cancelled', 'dispute', 'in_progress'],
  completed: ['archived'],
  cancelled: ['archived'],
  expired: ['archived'],
  dispute: ['completed', 'cancelled', 'archived'],
  archived: [],
}

const ACTIVE_STATUSES: MissionStatus[] = ['accepted', 'on_the_way', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']

const STARTED_STATUSES: MissionStatus[] = ['arrived', 'in_progress', 'paused', 'awaiting_validation', 'completed', 'dispute']

export function isMissionActive(status: MissionStatus): boolean {
  return ACTIVE_STATUSES.includes(status)
}

export function missionStarted(status: MissionStatus): boolean {
  return STARTED_STATUSES.includes(status)
}

export function canTransition(fromRaw: string, toRaw: string, role?: MissionRole): { ok: boolean; reason?: string } {
  const from = normalizeStatus(fromRaw)
  const to = normalizeStatus(toRaw)
  if (from === to) return { ok: false, reason: `Statut déjà ${DISPLAY_LABELS[from]}` }
  const allowed = STATUS_TRANSITIONS[from] || []
  if (!allowed.includes(to)) return { ok: false, reason: `Transition interdite: ${DISPLAY_LABELS[from]} → ${DISPLAY_LABELS[to]}` }

  if (role) {
    // Provider cannot complete directly; needs validation by client.
    if (role === 'provider' && to === 'completed') return { ok: false, reason: 'Seul le client peut valider la fin de la mission' }
    // Provider cannot cancel once mission started (arrived/in_progress...)
    if (role === 'provider' && to === 'cancelled' && missionStarted(from)) {
      return { ok: false, reason: 'Vous ne pouvez plus annuler une mission démarrée' }
    }
    // System/admin explicit only for dispute/archive/expire
    if (role !== 'admin' && role !== 'system') {
      if (['dispute', 'archived'].includes(to)) {
        return { ok: false, reason: 'Action réservée au support' }
      }
    }
  }
  return { ok: true }
}

export type TransitionOptions = {
  actor: { userId: string; role: MissionRole }
  reason?: string
  metadata?: Record<string, unknown>
  dontSave?: boolean
}

export async function transition(
  requestId: string,
  toRaw: string,
  options: TransitionOptions
) {
  await connectIfNeeded()
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) throw new Error('Mission introuvable')
  const from = normalizeStatus(sr.status)
  const to = normalizeStatus(toRaw)
  const { actor, reason, metadata } = options

  const check = canTransition(from, to, actor.role)
  if (!check.ok) throw new Error(check.reason)

  const isOwner = String(sr.clientId) === String(actor.userId)
  const isProvider = String(sr.assignedProviderId) === String(actor.userId)
  if (actor.role === 'client' && !isOwner) throw new Error('Action interdite')
  if (actor.role === 'provider' && !isProvider) throw new Error('Action interdite')

  const prevStatus = sr.status
  const now = new Date()

  // Apply canonical status
  sr.status = to
  sr.lastActivityAt = now

  // Timestamps
  if (to === 'broadcasted') { (sr as any).broadcastedAt = now; }
  if (to === 'accepted') { (sr as any).assignedAt = now; }
  if (to === 'on_the_way') { (sr as any).providerArrivingAt = now; }
  if (to === 'arrived') { (sr as any).arrivedAt = now; }
  if (to === 'in_progress') {
    if (!(sr as any).startedAt) { (sr as any).startedAt = now; }
  }
  if (to === 'awaiting_validation') {
    (sr as any).providerCompletedAt = now;
  }
  if (to === 'completed') {
    (sr as any).completedAt = now;
    (sr as any).validatedByClientAt = now;
    // Financial release
    await releaseHeldPayments(sr, actor.userId);
    if (sr.assignedProviderId) {
      void incrementProviderCompleted(String(sr.assignedProviderId));
      void creditReferrerOnFirstMission(String(sr.clientId), 1000);
    }
  }
  if (to === 'cancelled') {
    (sr as any).cancelledAt = now;
    (sr as any).cancelledBy = actor.role === 'provider' ? 'provider' : isOwner ? 'client' : actor.role;
    if (reason) { (sr as any).cancelReason = String(reason).slice(0, 500); }
    await handleCancellationSideEffects(sr, prevStatus, actor);
  }
  if (to === 'expired') {
    (sr as any).expiredAt = now;
  }
  if (to === 'paused') {
    // pause is handled by pause() function; transition alone should not create pauseLog
  }
  if (to === 'dispute') {
    (sr as any).disputeOpenedAt = now;
    if (reason) { (sr as any).disputeReason = String(reason).slice(0, 500); }
  }
  if (to === 'archived') {
    (sr as any).archivedAt = now;
    (sr as any).archivedReason = reason || 'manual';
  }

  await sr.save()
  await notifyStatusChange(sr, prevStatus, actor, metadata)
  return sr
}

export type PauseOptions = {
  actor: { userId: string; role: MissionRole }
  reason: string
  comment?: string
  estimatedResumeAt?: string | Date
}

export async function pause(requestId: string, options: PauseOptions) {
  await connectIfNeeded()
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) throw new Error('Mission introuvable')
  const from = normalizeStatus(sr.status)
  if (from === 'paused') throw new Error('Mission déjà en pause')
  if (!isMissionActive(from)) throw new Error('Impossible de mettre en pause cette mission')

  const isOwner = String(sr.clientId) === String(options.actor.userId)
  const isProvider = String(sr.assignedProviderId) === String(options.actor.userId)
  if (options.actor.role === 'client' && !isOwner) throw new Error('Action interdite')
  if (options.actor.role === 'provider' && !isProvider) throw new Error('Action interdite')
  if (!options.reason) throw new Error('La raison de la pause est obligatoire')

  const now = new Date()
  const pauseEntry = {
    startedAt: now,
    pausedBy: options.actor.role === 'provider' ? 'provider' : 'client',
    pausedById: options.actor.userId,
    reason: options.reason,
    comment: options.comment ? String(options.comment).slice(0, 500) : undefined,
    estimatedResumeAt: options.estimatedResumeAt ? new Date(options.estimatedResumeAt) : undefined,
    endedAt: undefined as Date | undefined,
  }

  ;(sr as any).pauseLog = [...((sr as any).pauseLog || []), pauseEntry]
  ;(sr as any).pausedFromStatus = sr.status
  sr.status = 'paused'
  sr.lastActivityAt = now

  await sr.save()
  await notifyStatusChange(sr, from, options.actor, { type: 'pause' })
  return sr
}

export async function resume(requestId: string, actor: { userId: string; role: MissionRole }) {
  await connectIfNeeded()
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) throw new Error('Mission introuvable')
  const from = normalizeStatus(sr.status)
  if (from !== 'paused') throw new Error('Mission non en pause')

  const isOwner = String(sr.clientId) === String(actor.userId)
  const isProvider = String(sr.assignedProviderId) === String(actor.userId)
  if (actor.role === 'client' && !isOwner) throw new Error('Action interdite')
  if (actor.role === 'provider' && !isProvider) throw new Error('Action interdite')

  const now = new Date()
  const log = ((sr as any).pauseLog || []) as any[]
  const currentPause = log[log.length - 1]
  if (currentPause && !currentPause.endedAt) {
    currentPause.endedAt = now
  }
  ;(sr as any).pauseLog = log

  const previous = normalizeStatus((sr as any).pausedFromStatus || 'in_progress')
  sr.status = STATUS_TRANSITIONS['paused'].includes(previous) ? previous : 'in_progress'
  sr.lastActivityAt = now

  await sr.save()
  await notifyStatusChange(sr, 'paused', actor, { type: 'resume' })
  return sr
}

export async function validateCompletion(requestId: string, actor: { userId: string; role: MissionRole }) {
  return transition(requestId, 'completed', { actor })
}

export async function openDispute(requestId: string, reason: string, actor: { userId: string; role: MissionRole }) {
  return transition(requestId, 'dispute', { actor, reason })
}

export async function archive(requestId: string, archiveReason: string, actor: { userId: string; role: MissionRole }) {
  return transition(requestId, 'archived', { actor, reason: archiveReason })
}

export async function expire(requestId: string) {
  await connectIfNeeded()
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) return null
  const from = normalizeStatus(sr.status)
  if (!['created', 'broadcasted'].includes(from)) return null
  return transition(requestId, 'expired', { actor: { userId: 'system', role: 'system' } })
}

export async function touch(requestId: string, eventType?: string, actorId?: string) {
  await connectIfNeeded()
  const update: any = { lastActivityAt: new Date() }
  if (eventType) {
    update.lastActivityType = eventType
    if (actorId) update.lastActivityBy = actorId
  }
  return ServiceRequest.findByIdAndUpdate(requestId, { $set: update }, { new: true })
}

export type LifecycleMetrics = {
  status: MissionStatus
  createdAt: string
  lastActivityAt: string
  elapsedMs: number
  activeMs: number
  pausedMs: number
  pauseCount: number
  isPaused: boolean
  health: 'active' | 'idle' | 'stale' | 'paused'
  healthLabel: string
  estimatedResumeAt?: string
  currentPauseReason?: string
}

export function computeMetrics(sr: any): LifecycleMetrics {
  const status = normalizeStatus(sr.status)
  const now = Date.now()
  const createdAt = sr.createdAt ? new Date(sr.createdAt).toISOString() : new Date().toISOString()
  const lastActivityAt = sr.lastActivityAt ? new Date(sr.lastActivityAt).toISOString() : createdAt
  const elapsedMs = now - new Date(createdAt).getTime()

  const pauseLog: any[] = (sr.pauseLog || [])
  let pausedMs = 0
  pauseLog.forEach((p: any) => {
    const start = new Date(p.startedAt).getTime()
    const end = p.endedAt ? new Date(p.endedAt).getTime() : now
    if (end > start) pausedMs += end - start
  })

  const activeMs = Math.max(0, elapsedMs - pausedMs)
  const isPaused = status === 'paused'
  const lastActivityMs = now - new Date(lastActivityAt).getTime()

  let health: LifecycleMetrics['health'] = 'active'
  if (isPaused) health = 'paused'
  else if (lastActivityMs > 7 * 24 * 60 * 60 * 1000) health = 'stale'
  else if (lastActivityMs > 24 * 60 * 60 * 1000) health = 'idle'

  const healthLabels: Record<string, string> = {
    active: 'Active',
    idle: 'Peu active',
    stale: 'Inactive',
    paused: 'En pause',
  }

  const currentPause = pauseLog[pauseLog.length - 1]
  return {
    status,
    createdAt,
    lastActivityAt,
    elapsedMs,
    activeMs,
    pausedMs,
    pauseCount: pauseLog.length,
    isPaused,
    health,
    healthLabel: healthLabels[health],
    estimatedResumeAt: currentPause?.estimatedResumeAt ? new Date(currentPause.estimatedResumeAt).toISOString() : undefined,
    currentPauseReason: currentPause?.reason,
  }
}

export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (m < 60) return `${m}min ${s}s`
  const h = Math.floor(m / 60)
  const remM = m % 60
  if (h < 24) return `${h}h ${remM}min`
  const d = Math.floor(h / 24)
  const remH = h % 24
  return `${d}j ${remH}h`
}

async function connectIfNeeded() {
  // Mongoose connection is expected to be already open from callers (routes).
  // No-op if ready.
  if (mongoose.connection.readyState !== 1) {
    const { connectMongoose } = await import('./mongoose')
    await connectMongoose()
  }
}

async function notifyStatusChange(sr: any, prevStatus: string, actor: { userId: string; role: MissionRole }, metadata?: Record<string, unknown>) {
  const io = (global as any).io
  const id = String(sr._id)
  if (io) {
    io.to(`request-${id}`).emit('request:status-changed', { requestId: id, status: sr.status, prevStatus, actorRole: actor.role, metadata })
    io.to(`user-${sr.clientId}`).emit('request:status-changed', { requestId: id, status: sr.status, prevStatus })
    if (sr.assignedProviderId) {
      io.to(`provider-${sr.assignedProviderId}`).emit('mission:status-changed', { requestId: id, status: sr.status, prevStatus })
    }
  }

  const statusLabels: Record<string, string> = {
    broadcasted: '📡 Mission diffusée',
    accepted: '✅ Mission acceptée',
    on_the_way: '🚗 En route',
    arrived: '📍 Prestataire arrivé',
    in_progress: '🛠️ Mission démarrée',
    paused: '⏸️ Mission en pause',
    awaiting_validation: '⏳ Validation en attente',
    completed: '✅ Mission terminée',
    cancelled: '❌ Mission annulée',
    expired: '⏰ Mission expirée',
    dispute: '⚠️ Litige ouvert',
    archived: '📦 Mission archivée',
  }
  const label = statusLabels[sr.status]
  if (label) {
    const recipient = actor.role === 'provider' ? String(sr.clientId) : sr.assignedProviderId ? String(sr.assignedProviderId) : null
    if (recipient) {
      void sendPushToUser(recipient, {
        title: label,
        body: `Mission ${id.slice(-6).toUpperCase()} — ${DISPLAY_LABELS[normalizeStatus(sr.status)]}`,
        data: { type: 'request:status-changed', requestId: id, status: sr.status },
        appType: actor.role === 'provider' ? 'consumer' : 'provider',
      })
    }
  }

  // Visibility Engine cleanup
  if (['accepted', 'cancelled', 'completed', 'expired', 'archived'].includes(sr.status)) {
    void closeDispatch(id, sr.status === 'accepted' ? 'assigned' : sr.status)
  }
}

async function releaseHeldPayments(sr: any, validatedByUserId: string) {
  try {
    const heldPayments = await Payment.find({ requestId: sr._id, status: 'held' }).sort({ createdAt: 1 })
    const cfg = await getAppConfig()
    const commissionRate = Number(cfg.monetization?.commissionRate) || 0
    const now = new Date()
    for (const payment of heldPayments as any[]) {
      const rawAmount = payment.phase === 'deposit' ? payment.depositAmount : payment.amount
      if (rawAmount <= 0) continue
      const commission = Math.round((rawAmount * commissionRate) / 100)
      const net = rawAmount - commission
      if (payment.provider !== 'cash' && net > 0) {
        await creditCashBalance(String(payment.providerId), net, {
          relatedMissionId: String(sr._id),
          paymentRef: String(payment._id),
          description: `Reversement mission validée ${payment.phase === 'deposit' ? '(dépôt)' : payment.phase === 'balance' ? '(solde)' : '(total)'}`,
        })
      }
      payment.status = 'released'
      payment.releasedAt = now
      await payment.save()
    }
    if (heldPayments.length && sr.assignedProviderId) {
      void sendPushToUser(String(sr.assignedProviderId), {
        title: 'Paiement reçu',
        body: 'Mission validée : les fonds ont été crédités sur votre portefeuille.',
        data: { type: 'payment:released', requestId: String(sr._id) },
        appType: 'provider',
      })
    }
  } catch (e) {
    console.error('[lifecycle] releaseHeldPayments', e)
  }
}

async function handleCancellationSideEffects(sr: any, prevStatus: string, actor: { userId: string; role: MissionRole }) {
  try {
    // Provider cancellation impact
    if (sr.assignedProviderId && ['accepted', 'on_the_way', 'arrived'].includes(prevStatus)) {
      if (actor.role === 'provider') {
        void penalizeProviderCancellation(String(sr.assignedProviderId), severityFromStatus(prevStatus))
      } else if (String(sr.clientId) === String(actor.userId)) {
        void recordClientCancellation(String(sr.assignedProviderId))
      }
    }
  } catch (e) {
    console.error('[lifecycle] cancellation ranking side effect', e)
  }

  try {
    const now = new Date()
    const heldPayment = await Payment.findOne({ requestId: sr._id, status: 'held' })
    if (heldPayment) {
      const isClient = String(sr.clientId) === String(actor.userId)
      const clientLateCancellation = isClient && ['on_the_way', 'arrived'].includes(prevStatus)
      if (clientLateCancellation && heldPayment.depositAmount > 0) {
        const cfg = await getAppConfig()
        const commissionRate = Number(cfg.monetization?.commissionRate) || 0
        const rawAmount = heldPayment.depositAmount
        const commission = Math.round((rawAmount * commissionRate) / 100)
        const net = rawAmount - commission
        if (heldPayment.provider !== 'cash' && net > 0) {
          await creditCashBalance(String(heldPayment.providerId), net, {
            relatedMissionId: String(sr._id),
            paymentRef: String(heldPayment._id),
            description: 'Dépôt de garantie suite à annulation tardive client',
          })
        }
        heldPayment.status = 'released'
        heldPayment.releasedAt = now
        await heldPayment.save()
        if (sr.assignedProviderId) {
          void sendPushToUser(String(sr.assignedProviderId), {
            title: 'Dépôt de garantie reçu',
            body: `${net.toLocaleString('fr-FR')} FCFA crédités suite à l'annulation tardive du client.`,
            data: { type: 'payment:released', requestId: String(sr._id) },
            appType: 'provider',
          })
        }
      } else {
        heldPayment.status = 'refunded'
        heldPayment.refundedAt = now
        await heldPayment.save()
        const escrowCost = heldPayment.escrowPointsCharged || 0
        if (escrowCost > 0) {
          await refundEscrowPoints(String(heldPayment.clientId), String(sr._id), escrowCost)
        }
      }
    }
  } catch (e) {
    console.error('[lifecycle] cancellation payment side effect', e)
  }
}

// Avoid top-level circular import: lazy-load referrer helper.
async function creditReferrerOnFirstMission(clientId: string, points: number) {
  try {
    const { creditReferrerOnFirstMission: fn } = await import('./referral')
    await fn(clientId, points)
  } catch (e) {
    console.error('[lifecycle] creditReferrerOnFirstMission', e)
  }
}
