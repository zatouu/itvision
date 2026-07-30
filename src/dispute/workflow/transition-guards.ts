import { DisputeStatus, DisputeDecision, ActorType } from '../domain/enums'
import type { Actor } from '../domain/types'
import type { DisputeEntity } from '../domain/entity'
import { DisputeBusinessError, DisputeTransitionError } from '../domain/exception'
import { canTransition } from './state-machine'

export interface OpenGuardContext {
  missionStatus?: string
  activeDisputeCount: number
}

export function assertCanOpen(
  entity: DisputeEntity,
  context: OpenGuardContext
): void {
  if (context.activeDisputeCount > 0) {
    throw new DisputeBusinessError('Une dispute est déjà active pour cette mission', 409)
  }
  if (context.missionStatus === 'cancelled') {
    throw new DisputeBusinessError('Impossible d\'ouvrir un litige sur une mission annulée', 409)
  }
}

export function assertTransitionAllowed(
  entity: DisputeEntity,
  to: DisputeStatus
): void {
  if (!canTransition(entity.status, to)) {
    throw new DisputeTransitionError(entity.status, to)
  }
}

export function assertCanTakeDecision(entity: DisputeEntity): void {
  entity.assertCanTakeDecision()
}

export function assertCanClose(entity: DisputeEntity): void {
  if (entity.isClosed) {
    throw new DisputeBusinessError('Le litige est déjà clôturé', 409)
  }
  if (
    entity.status !== DisputeStatus.DECIDED &&
    entity.status !== DisputeStatus.APPEALED &&
    entity.status !== DisputeStatus.UNDER_REVIEW
  ) {
    throw new DisputeBusinessError(
      'Le litige ne peut être clôturé que depuis les statuts DECIDED, APPEALED ou UNDER_REVIEW',
      409
    )
  }
  if (!entity.decision) {
    throw new DisputeBusinessError('Impossible de clôturer sans décision', 409)
  }
}

export function assertActorIsAdmin(actor: Actor): void {
  if (actor.type !== ActorType.ADMIN) {
    throw new DisputeBusinessError('Action réservée aux administrateurs', 403)
  }
}

export function assertActorIsParticipant(entity: DisputeEntity, actor: Actor): void {
  if (actor.type === ActorType.ADMIN) return
  if (actor.type === ActorType.CLIENT && actor.id === entity.clientId) return
  if (actor.type === ActorType.PROVIDER && actor.id === entity.providerId) return
  throw new DisputeBusinessError('Action non autorisée pour cet acteur', 403)
}
