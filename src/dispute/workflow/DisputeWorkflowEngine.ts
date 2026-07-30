import type { DisputeEntity } from '../domain/entity'
import type { DisputeStatus, DisputeDecision, DisputePriority, DisputeReason } from '../domain/enums'
import type { Actor } from '../domain/types'

export interface OpenInput {
  missionId: string
  clientId: string
  providerId: string
  paymentId?: string | null
  reason: DisputeReason
  description: string
  priority?: DisputePriority
  metadata?: Record<string, unknown>
}

export interface DecisionInput {
  decisionId: string
  decision: DisputeDecision
  reason: string
  adminId: string
  amount?: number | null
}

export interface WorkflowContext {
  missionStatus?: string
  activeDisputeCount: number
  paymentId?: string | null
}

export interface WorkflowResult {
  entity: DisputeEntity
  events: DisputeWorkflowEvent[]
}

export type DisputeWorkflowEvent =
  | { type: 'DisputeOpened'; dispute: DisputeEntity; actor: Actor }
  | { type: 'DisputeAssigned'; dispute: DisputeEntity; actor: Actor; adminId: string }
  | { type: 'DisputeEvidenceRequested'; dispute: DisputeEntity; actor: Actor; target: 'CLIENT' | 'PROVIDER' }
  | { type: 'DisputeReplied'; dispute: DisputeEntity; actor: Actor; message?: string }
  | { type: 'DisputeDecisionTaken'; dispute: DisputeEntity; actor: Actor; decisionId: string }
  | { type: 'DisputeAppealed'; dispute: DisputeEntity; actor: Actor; reason: string }
  | { type: 'DisputeClosed'; dispute: DisputeEntity; actor: Actor }
  | { type: 'DisputeStateChanged'; dispute: DisputeEntity; actor: Actor; from: DisputeStatus; to: DisputeStatus; reason?: string }
  | { type: 'EscrowFreezeRequested'; missionId: string; paymentId?: string | null }
  | { type: 'EscrowReleaseRequested'; missionId: string; paymentId?: string | null }
  | { type: 'EscrowRefundRequested'; missionId: string; paymentId?: string | null; amount?: number | null }

export interface DisputeWorkflowEngine {
  open(input: OpenInput, actor: Actor, context: WorkflowContext): WorkflowResult
  assign(entity: DisputeEntity, adminId: string, actor: Actor): WorkflowResult
  reply(entity: DisputeEntity, actor: Actor, message: string, evidenceSubmitted?: boolean): WorkflowResult
  requestEvidence(entity: DisputeEntity, target: 'CLIENT' | 'PROVIDER', actor: Actor): WorkflowResult
  takeDecision(entity: DisputeEntity, input: DecisionInput, actor: Actor): WorkflowResult
  appeal(entity: DisputeEntity, reason: string, actor: Actor): WorkflowResult
  close(entity: DisputeEntity, actor: Actor): WorkflowResult
  changeState(entity: DisputeEntity, to: DisputeStatus, actor: Actor, reason?: string): WorkflowResult
  canTransition(from: DisputeStatus, to: DisputeStatus): boolean
}
