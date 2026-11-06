import { DisputeStatus, DisputePriority, DisputeDecision, ActorType } from '../domain/enums'
import { DisputeEntity } from '../domain/entity'
import type { Actor, DisputeProps } from '../domain/types'
import { DisputeValidationError, DisputeBusinessError } from '../domain/exception'
import { canTransition } from './state-machine'
import {
  assertCanOpen,
  assertTransitionAllowed,
  assertCanTakeDecision,
  assertCanClose,
  assertActorIsAdmin,
  assertActorIsParticipant,
} from './transition-guards'
import { generateDisputeReference } from './reference'
import type {
  DisputeWorkflowEngine,
  OpenInput,
  DecisionInput,
  WorkflowContext,
  WorkflowResult,
} from './DisputeWorkflowEngine'

const DEFAULT_PRIORITY = DisputePriority.NORMAL

const now = () => new Date()

export class DefaultDisputeWorkflowEngine implements DisputeWorkflowEngine {
  canTransition(from: DisputeStatus, to: DisputeStatus): boolean {
    return canTransition(from, to)
  }

  open(input: OpenInput, actor: Actor, context: WorkflowContext): WorkflowResult {
    DisputeEntity.validateCreate({
      missionId: input.missionId,
      clientId: input.clientId,
      providerId: input.providerId,
      reason: input.reason,
      description: input.description,
      priority: input.priority,
    })

    const priority = input.priority ?? DEFAULT_PRIORITY
    const reference = generateDisputeReference()
    const openedAt = now()

    const props: DisputeProps = {
      reference,
      missionId: input.missionId,
      clientId: input.clientId,
      providerId: input.providerId,
      paymentId: input.paymentId ?? context.paymentId ?? null,
      status: DisputeStatus.OPEN,
      priority,
      reason: input.reason,
      description: input.description,
      assignedAdminId: null,
      decision: null,
      decisionId: null,
      openedAt,
      updatedAt: openedAt,
      closedAt: null,
      slaDeadlineAt: null,
      escalationCount: 0,
      metadata: input.metadata || {},
    }

    const entity = new DisputeEntity(props)
    assertCanOpen(entity, context)

    const events: WorkflowResult['events'] = [
      { type: 'DisputeOpened', dispute: entity, actor },
      { type: 'EscrowFreezeRequested', missionId: input.missionId, paymentId: entity.paymentId },
    ]

    return { entity, events }
  }

  assign(entity: DisputeEntity, adminId: string, actor: Actor): WorkflowResult {
    assertActorIsAdmin(actor)
    entity.assertCanModify()
    if (!adminId?.trim()) throw new DisputeValidationError('adminId requis')

    const updated = entity.withProps({ assignedAdminId: adminId })
    const events: WorkflowResult['events'] = [
      { type: 'DisputeAssigned', dispute: updated, actor, adminId },
    ]
    return { entity: updated, events }
  }

  reply(
    entity: DisputeEntity,
    actor: Actor,
    message: string,
    evidenceSubmitted: boolean = false
  ): WorkflowResult {
    assertActorIsParticipant(entity, actor)
    entity.assertCanModify()
    if (!message?.trim()) throw new DisputeValidationError('Message requis')

    const isProviderReply =
      actor.type === ActorType.PROVIDER && entity.status === DisputeStatus.WAITING_PROVIDER
    const isClientReply =
      actor.type === ActorType.CLIENT && entity.status === DisputeStatus.WAITING_CLIENT

    let updated = entity
    if (isProviderReply || isClientReply) {
      const nextStatus = evidenceSubmitted
        ? DisputeStatus.UNDER_REVIEW
        : DisputeStatus.OPEN
      assertTransitionAllowed(entity, nextStatus)
      updated = entity.withProps({ status: nextStatus })
    }

    const events: WorkflowResult['events'] = [
      { type: 'DisputeReplied', dispute: updated, actor, message },
    ]
    return { entity: updated, events }
  }

  requestEvidence(
    entity: DisputeEntity,
    target: 'CLIENT' | 'PROVIDER',
    actor: Actor
  ): WorkflowResult {
    assertActorIsAdmin(actor)
    entity.assertCanModify()

    const targetStatus =
      target === 'CLIENT' ? DisputeStatus.WAITING_CLIENT : DisputeStatus.WAITING_PROVIDER

    if (
      entity.status !== DisputeStatus.OPEN &&
      entity.status !== DisputeStatus.UNDER_REVIEW
    ) {
      throw new DisputeBusinessError(
        `Impossible de demander des preuves depuis le statut ${entity.status}`,
        409
      )
    }

    assertTransitionAllowed(entity, targetStatus)
    const updated = entity.withProps({ status: targetStatus })

    const events: WorkflowResult['events'] = [
      { type: 'DisputeEvidenceRequested', dispute: updated, actor, target },
    ]
    return { entity: updated, events }
  }

  takeDecision(
    entity: DisputeEntity,
    input: DecisionInput,
    actor: Actor
  ): WorkflowResult {
    assertActorIsAdmin(actor)
    assertCanTakeDecision(entity)

    if (!input.reason?.trim()) {
      throw new DisputeValidationError('Motif de la décision requis')
    }

    if (!input.decisionId?.trim()) {
      throw new DisputeValidationError('decisionId requis')
    }

    if (input.decision === DisputeDecision.PARTIAL_REFUND) {
      if (input.amount == null || input.amount <= 0) {
        throw new DisputeValidationError('Montant requis pour un remboursement partiel')
      }
    }

    if (input.decision === DisputeDecision.CANCEL) {
      const updated = entity.withProps({
        status: DisputeStatus.CLOSED,
        decision: input.decision,
        decisionId: input.decisionId,
        closedAt: now(),
      })
      const events: WorkflowResult['events'] = [
        { type: 'DisputeDecisionTaken', dispute: updated, actor, decisionId: input.decisionId },
        { type: 'DisputeClosed', dispute: updated, actor },
      ]
      return { entity: updated, events }
    }

    assertTransitionAllowed(entity, DisputeStatus.DECIDED)
    const updated = entity.withProps({
      status: DisputeStatus.DECIDED,
      decision: input.decision,
      decisionId: input.decisionId,
    })

    const events: WorkflowResult['events'] = [
      { type: 'DisputeDecisionTaken', dispute: updated, actor, decisionId: input.decisionId },
      { type: 'EscrowReleaseRequested', missionId: entity.missionId, paymentId: entity.paymentId },
    ]

    if (
      input.decision === DisputeDecision.REFUND ||
      input.decision === DisputeDecision.PARTIAL_REFUND
    ) {
      events.push({
        type: 'EscrowRefundRequested',
        missionId: entity.missionId,
        paymentId: entity.paymentId,
        amount: input.amount,
      })
    }

    return { entity: updated, events }
  }

  appeal(entity: DisputeEntity, reason: string, actor: Actor): WorkflowResult {
    assertActorIsParticipant(entity, actor)
    entity.assertCanModify()
    if (entity.status !== DisputeStatus.DECIDED) {
      throw new DisputeBusinessError('Un appel n\'est possible qu\'après une décision', 409)
    }
    if (!reason?.trim()) throw new DisputeValidationError('Motif de l\'appel requis')

    assertTransitionAllowed(entity, DisputeStatus.APPEALED)
    const updated = entity.withProps({ status: DisputeStatus.APPEALED })

    const events: WorkflowResult['events'] = [
      { type: 'DisputeAppealed', dispute: updated, actor, reason },
    ]
    return { entity: updated, events }
  }

  close(entity: DisputeEntity, actor: Actor): WorkflowResult {
    assertActorIsAdmin(actor)
    assertCanClose(entity)

    const target =
      entity.status === DisputeStatus.APPEALED
        ? DisputeStatus.CLOSED
        : DisputeStatus.CLOSED

    assertTransitionAllowed(entity, target)
    const updated = entity.withProps({ status: target, closedAt: now() })

    const events: WorkflowResult['events'] = [
      { type: 'DisputeClosed', dispute: updated, actor },
      { type: 'EscrowReleaseRequested', missionId: entity.missionId, paymentId: entity.paymentId },
    ]

    return { entity: updated, events }
  }

  changeState(
    entity: DisputeEntity,
    to: DisputeStatus,
    actor: Actor,
    reason?: string
  ): WorkflowResult {
    assertActorIsAdmin(actor)
    if (entity.isClosed) {
      throw new DisputeBusinessError('Impossible de changer l\'état d\'un litige clôturé', 409)
    }

    assertTransitionAllowed(entity, to)
    const updated =
      to === DisputeStatus.CLOSED
        ? entity.withProps({ status: to, closedAt: now() })
        : entity.withProps({ status: to })

    const events: WorkflowResult['events'] = [
      {
        type: 'DisputeStateChanged',
        dispute: updated,
        actor,
        from: entity.status,
        to,
        reason,
      },
    ]
    return { entity: updated, events }
  }
}
