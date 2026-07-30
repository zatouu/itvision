import type { DisputeStatus, DisputePriority, DisputeReason, DisputeDecision, ActorType } from '../domain/enums'

export interface DisputeOpenedEvent {
  type: 'DisputeOpened'
  disputeId: string
  reference: string
  missionId: string
  clientId: string
  providerId: string
  paymentId?: string | null
  reason: DisputeReason
  priority: DisputePriority
  actor: { id: string; type: ActorType }
}

export interface DisputeAssignedEvent {
  type: 'DisputeAssigned'
  disputeId: string
  adminId: string
  actor: { id: string; type: ActorType }
}

export interface DisputeEvidenceAddedEvent {
  type: 'DisputeEvidenceAdded'
  disputeId: string
  evidenceId: string
  actor: { id: string; type: ActorType }
}

export interface DisputeMessageSentEvent {
  type: 'DisputeMessageSent'
  disputeId: string
  messageId: string
  actor: { id: string; type: ActorType }
}

export interface DisputeDecisionTakenEvent {
  type: 'DisputeDecisionTaken'
  disputeId: string
  decisionId: string
  decision: DisputeDecision
  actor: { id: string; type: ActorType }
}

export interface DisputeAppealedEvent {
  type: 'DisputeAppealed'
  disputeId: string
  reason: string
  actor: { id: string; type: ActorType }
}

export interface DisputeEscalatedEvent {
  type: 'DisputeEscalated'
  disputeId: string
  newPriority: DisputePriority
  reason: string
}

export interface DisputeClosedEvent {
  type: 'DisputeClosed'
  disputeId: string
  actor: { id: string; type: ActorType }
}

export interface EscrowFreezeRequestedEvent {
  type: 'EscrowFreezeRequested'
  missionId: string
  paymentId?: string | null
}

export interface EscrowReleaseRequestedEvent {
  type: 'EscrowReleaseRequested'
  missionId: string
  paymentId?: string | null
}

export interface EscrowRefundRequestedEvent {
  type: 'EscrowRefundRequested'
  missionId: string
  paymentId?: string | null
  amount?: number | null
}

export type DisputeDomainEvent =
  | DisputeOpenedEvent
  | DisputeAssignedEvent
  | DisputeEvidenceAddedEvent
  | DisputeMessageSentEvent
  | DisputeDecisionTakenEvent
  | DisputeAppealedEvent
  | DisputeEscalatedEvent
  | DisputeClosedEvent
  | EscrowFreezeRequestedEvent
  | EscrowReleaseRequestedEvent
  | EscrowRefundRequestedEvent
