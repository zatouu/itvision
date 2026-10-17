import mongoose from 'mongoose'
import ServiceRequest from './models/ServiceRequest'
import Offer from './models/Offer'
import MissionAuditLog from './models/MissionAuditLog'
import Payment from './models/Payment'
import { refreshMissionAnomalies } from './mission-anomalies'
import {
  getAppConfig,
  refundEscrowPoints,
  releaseMissionReservation,
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
  if (!raw) return 'created'
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
  created: ['broadcasted', 'accepted', 'cancelled', 'expired'],
  broadcasted: ['accepted', 'cancelled', 'expired'],
  accepted: ['on_the_way', 'cancelled', 'dispute'],
  on_the_way: ['arrived', 'cancelled', 'dispute'],
  arrived: ['in_progress', 'paused', 'cancelled', 'dispute'],
  in_progress: ['paused', 'awaiting_validation', 'cancelled', 'dispute'],
  paused: ['in_progress', 'cancelled', 'dispute'],
  awaiting_validation: ['completed', 'cancelled', 'dispute', 'in_progress'],
  completed: ['archived'],
  cancelled: ['archived'],
  expired: ['archived'],
  dispute: ['completed', 'cancelled', 'archived'],
  archived: [],
}

const ACTIVE_STATUSES: MissionStatus[] = ['accepted', 'on_the_way', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']

const STARTED_STATUSES: MissionStatus[] = ['arrived', 'in_progress', 'paused', 'awaiting_validation', 'completed', 'dispute']

const PAUSABLE_STATUSES: MissionStatus[] = ['arrived', 'in_progress']

const TERMINAL_STATUSES: MissionStatus[] = ['cancelled', 'expired', 'completed', 'archived']

const CANCELLABLE_STATUSES: MissionStatus[] = ['created', 'broadcasted', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']

/** Business error codes — stable, language-independent. The frontend maps these to UI messages. */
export type BusinessErrorCode =
  | 'ALREADY_CANCELLED'
  | 'ALREADY_COMPLETED'
  | 'ALREADY_EXPIRED'
  | 'CANNOT_CANCEL'
  | 'OFFER_ALREADY_ACCEPTED'
  | 'REQUEST_NOT_AVAILABLE'
  | 'TRANSITION_FORBIDDEN'

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(normalizeStatus(status))
}

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(normalizeStatus(status))
}

export function canCancel(status: string): boolean {
  return CANCELLABLE_STATUSES.includes(normalizeStatus(status))
}

export function canAcceptOffer(status: string): boolean {
  const s = normalizeStatus(status)
  return s === 'created' || s === 'broadcasted'
}

export function canNegotiate(status: string): boolean {
  const s = normalizeStatus(status)
  return s === 'created' || s === 'broadcasted'
}

/** Maps a transition failure reason to a stable business code. */
export function transitionErrorCode(fromRaw: string, toRaw: string): BusinessErrorCode {
  const from = normalizeStatus(fromRaw)
  const to = normalizeStatus(toRaw)
  if (from === to) {
    if (from === 'cancelled') return 'ALREADY_CANCELLED'
    if (from === 'completed') return 'ALREADY_COMPLETED'
    if (from === 'expired') return 'ALREADY_EXPIRED'
    return 'TRANSITION_FORBIDDEN'
  }
  if (to === 'cancelled') {
    if (from === 'completed') return 'ALREADY_COMPLETED'
    if (from === 'expired') return 'ALREADY_EXPIRED'
    if (from === 'archived') return 'REQUEST_NOT_AVAILABLE'
    return 'CANNOT_CANCEL'
  }
  if (TERMINAL_STATUSES.includes(from)) return 'REQUEST_NOT_AVAILABLE'
  return 'TRANSITION_FORBIDDEN'
}

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
    // Seul le client (ou admin) peut valider la fin de mission, et uniquement depuis awaiting_validation.
    // 'system' = validation automatique après délai (client prévenu, pas de litige ouvert).
    if (to === 'completed' && role !== 'client' && role !== 'admin' && role !== 'system') {
      return { ok: false, reason: 'Seul le client peut valider la fin de la mission' }
    }
    if (to === 'completed' && from !== 'awaiting_validation' && from !== 'dispute') {
      return { ok: false, reason: 'Validation impossible : la mission n\'est pas en attente de validation' }
    }
    // Le prestataire ne peut pas annuler une mission démarrée.
    if (role === 'provider' && to === 'cancelled' && missionStarted(from)) {
      return { ok: false, reason: 'Vous ne pouvez plus annuler une mission démarrée' }
    }
    // Travaux commencés : le client conteste par un litige, il n'annule pas (sinon remboursement d'un travail fait)
    if (role === 'client' && to === 'cancelled' && ['in_progress', 'paused', 'awaiting_validation'].includes(from)) {
      return { ok: false, reason: 'Les travaux ont commencé : ouvrez un litige si un problème survient' }
    }
    // Archivage et expiration : admin/system uniquement.
    if (role !== 'admin' && role !== 'system') {
      if (to === 'archived') return { ok: false, reason: 'Archivage réservé au support' }
      if (to === 'expired') return { ok: false, reason: 'Expiration automatique uniquement' }
    }
    // Un litige ne peut être ouvert que par client/provider/admin (pas system sans raison).
    if (to === 'dispute' && role !== 'client' && role !== 'provider' && role !== 'admin') {
      return { ok: false, reason: 'Ouverture de litige non autorisée' }
    }
    // Sortie d'un litige : admin/system uniquement (résolution).
    if (from === 'dispute' && role !== 'admin' && role !== 'system') {
      return { ok: false, reason: 'Résolution de litige réservée au support' }
    }
    // Retour en cours depuis awaiting_validation : seul le client (corrections) ou admin.
    if (from === 'awaiting_validation' && to === 'in_progress' && role !== 'client' && role !== 'admin') {
      return { ok: false, reason: 'Seul le client peut demander des corrections' }
    }
    // Transitions opérationnelles réservées au prestataire assigné (ou admin) : en route, arrivé, en cours, validation en attente.
    const providerOnlyTargets: MissionStatus[] = ['on_the_way', 'arrived', 'in_progress', 'awaiting_validation']
    if (role === 'client' && providerOnlyTargets.includes(to) && from !== 'awaiting_validation') {
      return { ok: false, reason: 'Cette action est réservée au prestataire assigné' }
    }
    // Pause depuis arrived/in_progress uniquement (vérifié plus bas via PAUSABLE_STATUSES).
  }
  return { ok: true }
}

export type TransitionContext = {
  ip?: string
  userAgent?: string
  platform?: string
}

export type TransitionOptions = {
  actor: { userId: string; role: MissionRole }
  reason?: string
  metadata?: Record<string, unknown>
  context?: TransitionContext
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
  const { actor, reason, metadata, context } = options

  const check = canTransition(from, to, actor.role)
  if (!check.ok) {
    const err = new Error(check.reason) as Error & { code?: BusinessErrorCode }
    err.code = transitionErrorCode(from, to)
    throw err
  }

  const isOwner = String(sr.clientId) === String(actor.userId)
  const isProvider = String(sr.assignedProviderId) === String(actor.userId)
  // Provider non assigné peut soumettre la première offre (created → broadcasted).
  const isBroadcastingCreated = actor.role === 'provider' && from === 'created' && to === 'broadcasted'
  if (actor.role === 'client' && !isOwner) throw new Error('Action interdite')
  if (actor.role === 'provider' && !isProvider && !isBroadcastingCreated) throw new Error('Action interdite')

  // Transition vers 'accepted' : doit fournir l'offre retenue et le prestataire.
  if (to === 'accepted') {
    const assignedProviderId = metadata?.assignedProviderId as string | undefined
    const selectedOfferId = metadata?.selectedOfferId as string | undefined
    if (!assignedProviderId || !selectedOfferId) {
      throw new Error('acceptation impossible : offre/prestataire manquant')
    }
  }

  // Transition vers 'paused' interdite ici : utiliser pause()
  if (to === 'paused') throw new Error('Utilisez pause() pour mettre en pause')
  if (from === 'dispute' && to !== 'dispute') throw new Error('Mission en litige : utilisez resolveDispute pour la résoudre')

  const prevStatus = sr.status
  const now = new Date()

  const $set: Record<string, any> = {
    status: to,
    lastActivityAt: now,
  }

  if (to === 'broadcasted') $set.broadcastedAt = now
  if (to === 'accepted') {
    $set.assignedAt = now
    $set.assignedProviderId = (metadata?.assignedProviderId as any) || sr.assignedProviderId
    $set.selectedOfferId = (metadata?.selectedOfferId as any) || sr.selectedOfferId
  }
  if (to === 'on_the_way') $set.providerArrivingAt = now
  if (to === 'arrived') $set.arrivedAt = now
  if (to === 'in_progress' && !sr.startedAt) $set.startedAt = now
  if (to === 'awaiting_validation') $set.providerCompletedAt = now
  if (to === 'completed') {
    $set.completedAt = now
    if (actor.role === 'system') $set.autoValidatedAt = now
    else $set.validatedByClientAt = now
  }
  if (to === 'cancelled') {
    $set.cancelledAt = now
    $set.cancelledBy = actor.role === 'provider' ? 'provider' : isOwner ? 'client' : actor.role
    if (reason) $set.cancelReason = String(reason).slice(0, 500)
  }
  if (to === 'expired') $set.expiredAt = now
  if (to === 'dispute') {
    $set.disputeOpenedAt = now
    $set.disputeStatus = 'open'
    if (reason) $set.disputeReason = String(reason).slice(0, 500)
    // Verrouiller l'escrow : ajouter un flag pour interdire toute libération.
    $set.escrowLocked = true
    $set.escrowLockedAt = now
    $set.escrowLockedBy = actor.userId
  }
  if (to === 'archived') {
    $set.archivedAt = now
    $set.archivedReason = reason || 'manual'
  }

  // Mise à jour atomique : seul le document avec le statut actuel est modifié.
  const conditions: any = { _id: requestId, status: { $in: [sr.status, from] } }
  const updated = await ServiceRequest.findOneAndUpdate(conditions, { $set }, { new: true, runValidators: true })
  if (!updated) {
    throw new Error('Conflit de mise à jour : la mission a déjà changé de statut, veuillez réessayer')
  }

  // Effets de bord post-transition (hors transaction, idempotents ou atomisés)
  if (to === 'completed') {
    await releaseHeldPayments(updated, actor.userId)
    if (updated.assignedProviderId) {
      void incrementProviderCompleted(String(updated.assignedProviderId))
      void creditReferrerOnFirstMission(String(updated.clientId), 1000)
    }
  }
  if (to === 'cancelled') {
    await handleCancellationSideEffects(updated, prevStatus, actor)
  }
  if (to === 'cancelled' || to === 'expired' || to === 'archived') {
    await closeOpenOffers(String(updated._id), to)
  }

  await notifyStatusChange(updated, prevStatus, actor, metadata)
  void import('./messaging/mission-system-messages')
    .then(m => m.postMissionSystemMessage(String(updated._id), to))
    .catch(() => {})
  // Coach IA : fiche conseils pour la nouvelle étape (fire-and-forget, mise en cache dans aiCoach)
  void import('./ai/mission-coach').then(m => m.generateMissionCoachStep(updated)).catch(() => {})
  await logAudit({
    requestId,
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'status_changed',
    fromStatus: prevStatus,
    toStatus: to,
    reason,
    metadata,
    context,
  })
  void refreshMissionAnomalies(requestId)
  return updated
}

export type PauseOptions = {
  actor: { userId: string; role: MissionRole }
  reason: string
  comment?: string
  estimatedResumeAt?: string | Date
  context?: TransitionContext
}

export async function pause(requestId: string, options: PauseOptions) {
  await connectIfNeeded()
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) throw new Error('Mission introuvable')
  const from = normalizeStatus(sr.status)
  if (from === 'paused') throw new Error('Mission déjà en pause')
  if (!PAUSABLE_STATUSES.includes(from)) throw new Error('Impossible de mettre en pause cette mission avant le démarrage')

  const isProvider = String(sr.assignedProviderId) === String(options.actor.userId)
  const isAdmin = options.actor.role === 'admin'
  // La pause est une action prestataire : le client dispose déjà d'annuler / litige / reprogrammer.
  if (options.actor.role === 'client') throw new Error('Seul le prestataire peut mettre la mission en pause')
  if (options.actor.role === 'provider' && !isProvider) throw new Error('Action interdite')
  if (!isProvider && !isAdmin) throw new Error('Action interdite')
  if (!options.reason) throw new Error('La raison de la pause est obligatoire')

  const now = new Date()
  const pauseEntry = {
    startedAt: now,
    pausedBy: options.actor.role === 'provider' ? 'provider' : options.actor.role === 'admin' ? 'admin' : 'client',
    pausedById: options.actor.userId,
    reason: options.reason,
    comment: options.comment ? String(options.comment).slice(0, 500) : undefined,
    estimatedResumeAt: options.estimatedResumeAt ? new Date(options.estimatedResumeAt) : undefined,
    endedAt: undefined as Date | undefined,
  }

  const previous = sr.status
  const updated = await ServiceRequest.findOneAndUpdate(
    { _id: requestId, status: { $in: [sr.status, from] } },
    {
      $set: { status: 'paused', pausedFromStatus: previous, lastActivityAt: now },
      $push: { pauseLog: pauseEntry },
    },
    { new: true, runValidators: true }
  )
  if (!updated) throw new Error('Conflit : la mission a déjà changé de statut')

  await notifyStatusChange(updated, from, options.actor, { type: 'pause' })
  // Coach IA : fiche conseils pour l'étape "pause" (fire-and-forget)
  void import('./ai/mission-coach').then(m => m.generateMissionCoachStep(updated)).catch(() => {})
  await logAudit({
    requestId,
    actorId: options.actor.userId,
    actorRole: options.actor.role,
    action: 'pause',
    fromStatus: previous,
    toStatus: 'paused',
    reason: options.reason,
    context: options.context,
  })
  void refreshMissionAnomalies(requestId)
  return updated
}

export async function resume(requestId: string, actor: { userId: string; role: MissionRole }, context?: TransitionContext) {
  await connectIfNeeded()
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) throw new Error('Mission introuvable')
  const from = normalizeStatus(sr.status)
  if (from !== 'paused') throw new Error('Mission non en pause')

  const isProvider = String(sr.assignedProviderId) === String(actor.userId)
  const isAdmin = actor.role === 'admin'
  // Reprise : prestataire assigné ou admin uniquement (symétrie avec pause()).
  if (actor.role === 'client') throw new Error('Seul le prestataire peut reprendre la mission')
  if (actor.role === 'provider' && !isProvider) throw new Error('Action interdite')
  if (!isProvider && !isAdmin) throw new Error('Action interdite')

  const now = new Date()
  const previous = normalizeStatus((sr as any).pausedFromStatus || 'in_progress')
  const target = STATUS_TRANSITIONS['paused'].includes(previous) ? previous : 'in_progress'

  const updated = await ServiceRequest.findOneAndUpdate(
    { _id: requestId, status: { $in: [sr.status, from] }, 'pauseLog.endedAt': { $exists: false } },
    {
      $set: { status: target, lastActivityAt: now, 'pauseLog.$[p].endedAt': now },
      $unset: { pausedFromStatus: 1 },
    },
    {
      new: true,
      runValidators: true,
      arrayFilters: [{ 'p.endedAt': { $exists: false } }],
    }
  )
  if (!updated) throw new Error('Conflit : la mission a déjà changé de statut ou la pause est terminée')

  await notifyStatusChange(updated, 'paused', actor, { type: 'resume' })
  // Coach IA : ré-émet la fiche de l'étape reprise depuis le cache (fire-and-forget)
  void import('./ai/mission-coach').then(m => m.generateMissionCoachStep(updated)).catch(() => {})
  await logAudit({
    requestId,
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'resume',
    fromStatus: 'paused',
    toStatus: target,
    context,
  })
  void refreshMissionAnomalies(requestId)
  return updated
}

export async function validateCompletion(
  requestId: string,
  actor: { userId: string; role: MissionRole },
  context?: TransitionContext
) {
  // 'system' : validation automatique (mission-inactivity-job) après préavis au client.
  if (actor.role !== 'client' && actor.role !== 'admin' && actor.role !== 'system') {
    throw new Error('Seul le client peut valider la fin de mission')
  }
  return transition(requestId, 'completed', { actor, context })
}

export async function openDispute(
  requestId: string,
  reason: string,
  actor: { userId: string; role: MissionRole },
  context?: TransitionContext
) {
  return transition(requestId, 'dispute', { actor, reason, context })
}

export type DisputeDecisionType =
  | 'release_escrow'
  | 'refund'
  | 'partial_refund'
  | 'reject'
  | 'cancel'
  | 'other'

export async function resolveDispute(
  requestId: string,
  decision: DisputeDecisionType,
  options: {
    actor: { userId: string; role: MissionRole }
    refundAmount?: number
    adminNote?: string
    context?: TransitionContext
  }
) {
  const { actor, refundAmount, adminNote, context } = options

  if (actor.role !== 'admin') {
    throw new Error('Seul un administrateur peut résoudre un litige')
  }

  await connectIfNeeded()
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) throw new Error('Mission introuvable')

  const from = normalizeStatus(sr.status)
  if (from !== 'dispute') {
    throw new Error(`La mission doit être en litige pour être résolue (statut actuel : ${from})`)
  }

  if ((decision === 'partial_refund') && (refundAmount == null || refundAmount <= 0)) {
    throw new Error('Le montant du remboursement partiel est requis')
  }

  const now = new Date()
  const prevStatus = sr.status

  // Déterminer le statut cible après résolution
  let toStatus: MissionStatus
  if (decision === 'refund') {
    toStatus = 'cancelled'
  } else if (decision === 'cancel' || decision === 'other') {
    toStatus = 'archived'
  } else {
    toStatus = 'completed'
  }

  // Deux administrateurs ne peuvent pas résoudre le même litige (double remboursement ou double reversement)
  const claimed = await ServiceRequest.updateOne({ _id: sr._id, status: 'dispute' }, { $set: { status: toStatus } })
  if (claimed.modifiedCount === 0) {
    throw new Error('Ce litige vient d’être résolu par un autre administrateur')
  }

  // Appliquer la résolution
  sr.status = toStatus
  sr.escrowLocked = false
  sr.disputeStatus = 'resolved'
  sr.disputeDecision = decision
  sr.disputeResolvedAt = now
  sr.disputeAdminId = actor.userId
  sr.disputeAdminNote = adminNote ? String(adminNote).slice(0, 2000) : undefined
  if (decision === 'partial_refund') {
    sr.disputeRefundAmount = refundAmount
  }

  if (toStatus === 'completed') {
    sr.completedAt = now
    sr.providerCompletedAt = now
    sr.validatedByClientAt = now
  } else if (toStatus === 'cancelled') {
    sr.cancelledAt = now
    sr.cancelledBy = 'admin'
    sr.cancelReason = adminNote ? String(adminNote).slice(0, 500) : 'Litige résolu : remboursement'
  } else if (toStatus === 'archived') {
    sr.archivedAt = now
    sr.archivedReason = adminNote ? String(adminNote).slice(0, 500) : 'Litige annulé/clôturé'
  }

  sr.updatedAt = now
  await sr.save()

  // Effets financiers
  await executeDisputePayments(sr, decision, refundAmount ?? 0, actor.userId)

  // Audit + notifications
  await logAudit({
    requestId,
    actorId: actor.userId,
    actorRole: actor.role,
    action: 'dispute_resolved',
    fromStatus: prevStatus,
    toStatus,
    reason: adminNote,
    metadata: { decision, refundAmount },
    context,
  })

  await notifyStatusChange(sr, prevStatus, actor, { decision, refundAmount })
  await notifyDisputeResolved(sr, decision, refundAmount)

  return sr
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
  const closedAt = sr.completedAt || sr.cancelledAt || sr.expiredAt || sr.archivedAt || sr.disputeOpenedAt
  const elapsedEndMs = ['completed', 'cancelled', 'expired', 'archived', 'dispute'].includes(status)
    ? (closedAt ? new Date(closedAt).getTime() : now)
    : now
  const elapsedMs = Math.max(0, elapsedEndMs - new Date(createdAt).getTime())

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

async function logAudit(entry: {
  requestId: string
  actorId?: string
  actorRole?: MissionRole
  action: any
  fromStatus?: string
  toStatus?: string
  reason?: string
  metadata?: Record<string, unknown>
  context?: TransitionContext
}) {
  try {
    await MissionAuditLog.create({
      requestId: entry.requestId,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      metadata: entry.metadata || {},
      ip: entry.context?.ip,
      userAgent: entry.context?.userAgent,
      platform: entry.context?.platform,
    })
  } catch (e) {
    console.error('[lifecycle] logAudit error', e)
  }
}

async function notifyStatusChange(sr: any, prevStatus: string, actor: { userId: string; role: MissionRole }, metadata?: Record<string, unknown>) {
  const io = (global as any).io
  const id = String(sr._id)
  if (io) {
    io.to(`request-${id}`).emit('request:status-changed', { requestId: id, status: sr.status, prevStatus, actorRole: actor.role, metadata })
    io.to(`user-${sr.clientId}`).emit('request:status-changed', { requestId: id, status: sr.status, prevStatus, actorRole: actor.role })
    if (sr.assignedProviderId) {
      io.to(`provider-${sr.assignedProviderId}`).emit('mission:status-changed', { requestId: id, status: sr.status, prevStatus, actorRole: actor.role })
    }
  }

  // Pas d'emoji : l'app affiche déjà une icône par type de notification.
  const statusLabels: Record<string, string> = {
    broadcasted: 'Mission diffusée',
    accepted: 'Mission acceptée',
    on_the_way: 'Prestataire en route',
    arrived: 'Prestataire arrivé',
    in_progress: 'Mission démarrée',
    paused: 'Mission en pause',
    awaiting_validation: 'Validation en attente',
    completed: 'Mission terminée',
    cancelled: 'Mission annulée',
    expired: 'Mission expirée',
    dispute: 'Litige ouvert',
    archived: 'Mission archivée',
  }
  const label = statusLabels[sr.status]
  if (label) {
    const cat = String(sr.category || 'Service').replace(/[-_]/g, ' ')
    const service = cat.charAt(0).toUpperCase() + cat.slice(1)
    const by = actor.role === 'client' ? ' par le client' : actor.role === 'provider' ? ' par le prestataire' : ''
    const body = sr.status === 'cancelled'
      ? `${service} — annulée${by}.`
      : `${service} · réf. ${id.slice(-6).toUpperCase()}`
    const recipients: { userId: string; appType: 'consumer' | 'provider' }[] = []
    if (sr.clientId) {
      recipients.push({ userId: String(sr.clientId), appType: 'consumer' })
    }
    if (sr.assignedProviderId) {
      recipients.push({ userId: String(sr.assignedProviderId), appType: 'provider' })
    }
    // L'auteur de l'action n'est pas notifié de sa propre action.
    for (const r of recipients.filter(r => r.userId !== String(actor.userId))) {
      void sendPushToUser(r.userId, {
        title: label,
        body,
        data: { type: 'request:status-changed', requestId: id, status: sr.status, prevStatus },
        appType: r.appType,
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
    if (sr.escrowLocked) {
      throw new Error('Paiement bloqué : un litige est en cours')
    }
    const cfg = await getAppConfig()
    const commissionRate = Number(cfg.monetization?.commissionRate) || 0
    const now = new Date()
    let releasedCount = 0
    let totalNet = 0

    // Boucle atomique : on récupère un paiement held non-cash, on le passe released avec findOneAndUpdate.
    // Les paiements cash restent held jusqu'à confirmation manuelle du prestataire.
    while (true) {
      const payment = await Payment.findOneAndUpdate(
        { requestId: sr._id, status: 'held', provider: { $ne: 'cash' } },
        { $set: { status: 'released', releasedAt: now, releasedBy: validatedByUserId } },
        { sort: { createdAt: 1 } }
      )
      if (!payment) break

      const rawAmount = payment.phase === 'deposit' ? payment.depositAmount : payment.amount
      if (rawAmount <= 0) continue
      const commission = Math.round((rawAmount * commissionRate) / 100)
      const net = rawAmount - commission

      if (net > 0) {
        const { payProvider } = await import('./payment-reconcile')
        await payProvider(payment, net, String(sr._id),
          `Reversement mission validée ${payment.phase === 'deposit' ? '(dépôt)' : payment.phase === 'balance' ? '(solde)' : '(total)'}`)
      }
      releasedCount++
      totalNet += net
    }

    if (releasedCount && sr.assignedProviderId) {
      void sendPushToUser(String(sr.assignedProviderId), {
        title: 'Paiement reçu',
        body: `${totalNet.toLocaleString('fr-FR')} FCFA crédités sur votre portefeuille.`,
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
    // Impact sur le classement du prestataire
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
    const isClient = String(sr.clientId) === String(actor.userId)
    const clientLateCancellation = isClient && ['on_the_way', 'arrived'].includes(prevStatus)

    while (true) {
      const held: any = await Payment.findOne({ requestId: sr._id, status: 'held' }).sort({ createdAt: 1 }).lean()
      if (!held) break

      const cfg = await getAppConfig()
      const commissionRate = Number(cfg.monetization?.commissionRate) || 0
      const rawAmount = held.depositAmount > 0 ? held.depositAmount : held.amount
      // Annulation tardive : le prestataire touche des frais de déplacement plafonnés, le reste revient au client
      const travelFee = clientLateCancellation ? Math.min(cancellationTravelFee(), rawAmount) : 0
      const clientRefund = held.amount - travelFee

      const heldPayment: any = await Payment.findOneAndUpdate(
        { _id: held._id, status: 'held' },
        {
          $set: clientRefund > 0
            ? { status: 'refunded', refundedAt: now, refundedBy: actor.userId, refundAmount: clientRefund }
            : { status: 'released', releasedAt: now, releasedBy: actor.userId },
        },
        { new: true }
      ).lean()
      if (!heldPayment) continue

      if (travelFee > 0) {
        const commission = Math.round((travelFee * commissionRate) / 100)
        const net = travelFee - commission
        if (heldPayment.provider !== 'cash' && net > 0) {
          const { payProvider } = await import('./payment-reconcile')
          await payProvider(heldPayment, net, String(sr._id), 'Frais de déplacement suite à annulation tardive client')
        }
        if (sr.assignedProviderId) {
          void sendPushToUser(String(sr.assignedProviderId), {
            title: 'Frais de déplacement reçus',
            body: `${net.toLocaleString('fr-FR')} FCFA crédités suite à l'annulation tardive du client.`,
            data: { type: 'payment:released', requestId: String(sr._id) },
            appType: 'provider',
          })
        }
      }

      if (clientRefund > 0) {
        const escrowCost = heldPayment.escrowPointsCharged || 0
        if (escrowCost > 0 && !clientLateCancellation) {
          await refundEscrowPoints(String(heldPayment.clientId), String(sr._id), escrowCost)
        }
        const { queueClientRefund } = await import('@/modules/xeuy/payments/mission-payment')
        const queued = await queueClientRefund(
          heldPayment._id,
          clientRefund,
          travelFee > 0 ? `Mission annulée (frais de déplacement retenus : ${travelFee} FCFA)` : 'Mission annulée'
        )
        void sendPushToUser(String(heldPayment.clientId), {
          title: queued ? 'Remboursement en cours' : 'Mission annulée',
          body: queued
            ? `${clientRefund.toLocaleString('fr-FR')} FCFA vont vous être remboursés suite à l'annulation${travelFee > 0 ? ` (${travelFee.toLocaleString('fr-FR')} FCFA de frais de déplacement retenus)` : ''}.`
            : 'Aucun montant n’a été prélevé pour cette mission.',
          data: { type: queued ? 'payment:refund_pending' : 'payment:refunded', requestId: String(sr._id) },
          appType: 'consumer',
        })
      }
    }
  } catch (e) {
    console.error('[lifecycle] cancellation payment side effect', e)
  }
}

/** Frais de déplacement retenus quand le client annule alors que le prestataire est en route ou arrivé. */
export function cancellationTravelFee(): number {
  const fee = Number(process.env.XEUY_CANCEL_TRAVEL_FEE)
  return Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : 2000
}

/**
 * Demande close (annulée/expirée/archivée) : expire les offres encore
 * soumises et libère les réservations de crédits des prestataires.
 * Idempotent : releaseMissionReservation ne traite que les 'reserved'.
 */
async function closeOpenOffers(requestId: string, toStatus: MissionStatus) {
  try {
    const openOffers = await Offer.find({ requestId, status: 'submitted' })
      .select('_id providerId')
      .lean() as any[]
    if (openOffers.length === 0) return

    await Offer.updateMany(
      { requestId, status: 'submitted' },
      { $set: { status: 'expired' } }
    )

    for (const offer of openOffers) {
      try {
        await releaseMissionReservation(String(offer.providerId), requestId, `Mission ${toStatus}`)
      } catch (err) {
        console.error('[lifecycle] releaseMissionReservation on close', String(offer._id), err)
      }
    }
  } catch (e) {
    console.error('[lifecycle] closeOpenOffers', e)
  }
}

async function executeDisputePayments(
  sr: any,
  decision: DisputeDecisionType,
  refundAmount: number,
  adminId: string
) {
  try {
    const cfg = await getAppConfig()
    const commissionRate = Number(cfg.monetization?.commissionRate) || 0
    const now = new Date()

    let remainingRefund = refundAmount
    let totalRefunded = 0
    let totalReleased = 0

    // Sans décision financière, les fonds restent en séquestre (à traiter par l'administration) : jamais libérés sans bénéficiaire
    if (decision === 'cancel' || decision === 'other') return

    const { payProvider } = await import('./payment-reconcile')
    const { queueClientRefund } = await import('@/modules/xeuy/payments/mission-payment')

    while (true) {
      const held: any = await Payment.findOne({ requestId: sr._id, status: 'held' })
        .sort({ createdAt: 1 })
        .lean()
      if (!held) break

      const rawAmount = held.phase === 'deposit' ? (held.depositAmount || 0)
        : held.phase === 'balance' ? (held.balanceAmount || 0)
        : (held.amount || 0)

      // Part remboursée au client pour ce paiement
      const paymentRefund = decision === 'refund' ? rawAmount
        : decision === 'partial_refund' ? Math.min(remainingRefund, rawAmount)
        : 0
      const toProvider = paymentRefund === 0

      // Réservation du paiement AVANT tout mouvement d'argent : un second passage ne le retrouve plus
      const payment: any = await Payment.findOneAndUpdate(
        { _id: held._id, status: 'held' },
        {
          $set: toProvider
            ? { status: 'released', releasedAt: now, releasedBy: adminId }
            : { status: 'refunded', refundedAt: now, refundedBy: adminId, refundAmount: paymentRefund },
        },
        { new: true }
      ).lean()
      if (!payment) continue
      if (rawAmount <= 0) continue

      if (paymentRefund > 0) {
        if (decision === 'refund' && (payment.escrowPointsCharged || 0) > 0) {
          await refundEscrowPoints(String(payment.clientId), String(sr._id), payment.escrowPointsCharged)
        }
        await queueClientRefund(payment._id, paymentRefund, decision === 'refund' ? 'Litige : remboursement intégral' : 'Litige : remboursement partiel')
        totalRefunded += paymentRefund
        remainingRefund -= paymentRefund
      }

      const providerGross = rawAmount - paymentRefund
      if (providerGross > 0 && payment.provider !== 'cash') {
        const commission = Math.round((providerGross * commissionRate) / 100)
        const providerNet = providerGross - commission
        await payProvider(payment, providerNet, String(sr._id),
          paymentRefund > 0
            ? `Reversement litige résolu (remboursement partiel client de ${paymentRefund} FCFA)`
            : 'Reversement mission validée (litige résolu)')
        totalReleased += providerNet
      }
    }

    // Notifications financières agrégées
    if (totalRefunded > 0 && sr.clientId) {
      void sendPushToUser(String(sr.clientId), {
        title: 'Remboursement effectué',
        body: `${totalRefunded.toLocaleString('fr-FR')} FCFA remboursés suite à la résolution du litige.`,
        data: { type: 'payment:refunded', requestId: String(sr._id), decision },
        appType: 'consumer',
      })
    }

    if (totalReleased > 0 && sr.assignedProviderId) {
      void sendPushToUser(String(sr.assignedProviderId), {
        title: 'Paiement reçu',
        body: `${totalReleased.toLocaleString('fr-FR')} FCFA crédités sur votre portefeuille suite au litige.`,
        data: { type: 'payment:released', requestId: String(sr._id), decision },
        appType: 'provider',
      })
    }
  } catch (e) {
    console.error('[lifecycle] executeDisputePayments', e)
  }
}

async function notifyDisputeResolved(
  sr: any,
  decision: DisputeDecisionType,
  refundAmount?: number
) {
  try {
    const decisionLabels: Record<string, string> = {
      release_escrow: 'Paiement libéré au prestataire',
      refund: 'Remboursement intégral au client',
      partial_refund: 'Remboursement partiel au client',
      reject: 'Litige rejeté',
      cancel: 'Litige annulé',
      other: 'Litige clôturé',
    }
    const label = decisionLabels[decision] || 'Litige résolu'

    const recipients: { userId: string; appType: 'consumer' | 'provider' }[] = []
    if (sr.clientId) recipients.push({ userId: String(sr.clientId), appType: 'consumer' })
    if (sr.assignedProviderId) recipients.push({ userId: String(sr.assignedProviderId), appType: 'provider' })

    for (const r of recipients) {
      void sendPushToUser(r.userId, {
        title: 'Litige résolu',
        body: `${label}${refundAmount ? ` (${refundAmount.toLocaleString('fr-FR')} FCFA)` : ''} — Mission ${String(sr._id).slice(-6).toUpperCase()}`,
        data: { type: 'dispute:resolved', requestId: String(sr._id), decision, refundAmount },
        appType: r.appType,
      })
    }
  } catch (e) {
    console.error('[lifecycle] notifyDisputeResolved', e)
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
