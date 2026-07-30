import type { Document } from 'mongoose'
import type { DisputeEntity } from '../domain/entity'
import type {
  DisputeProps,
  DisputeMessageProps,
  DisputeEvidenceProps,
  DisputeHistoryProps,
  DisputeDecisionProps,
} from '../domain/types'
import type {
  DisputeDto,
  DisputeMessageDto,
  DisputeEvidenceDto,
  DisputeHistoryDto,
  DisputeDecisionDto,
} from '../dto'
import type { IDispute } from '../model/Dispute'
import type { IDisputeMessage } from '../model/DisputeMessage'
import type { IDisputeEvidence } from '../model/DisputeEvidence'
import type { IDisputeHistory } from '../model/DisputeHistory'
import type { IDisputeDecision } from '../model/DisputeDecision'

function toISO(date?: Date | null): string | null {
  return date ? date.toISOString() : null
}

function stringId(value: unknown): string | null {
  if (value == null) return null
  return String(value)
}

export function toDisputeProps(doc: IDispute): DisputeProps {
  return {
    id: stringId(doc._id) || undefined,
    reference: doc.reference,
    missionId: stringId(doc.missionId)!,
    clientId: doc.clientId,
    providerId: stringId(doc.providerId)!,
    paymentId: stringId(doc.paymentId),
    status: doc.status,
    priority: doc.priority,
    reason: doc.reason,
    description: doc.description,
    assignedAdminId: stringId(doc.assignedAdminId),
    decision: doc.decision ?? null,
    decisionId: stringId(doc.decisionId),
    openedAt: doc.openedAt,
    updatedAt: doc.updatedAt,
    closedAt: doc.closedAt ?? null,
    slaDeadlineAt: doc.slaDeadlineAt ?? null,
    escalationCount: doc.escalationCount || 0,
    metadata: doc.metadata || {},
  }
}

export function toDisputeEntity(doc: IDispute): DisputeEntity {
  const { DisputeEntity } = require('../domain/entity')
  return new DisputeEntity(toDisputeProps(doc))
}

export function toDisputeDto(entity: DisputeEntity): DisputeDto {
  const props = entity.toProps()
  return {
    id: props.id!,
    reference: props.reference,
    missionId: props.missionId,
    clientId: props.clientId,
    providerId: props.providerId,
    paymentId: props.paymentId,
    status: props.status,
    priority: props.priority,
    reason: props.reason,
    description: props.description,
    assignedAdminId: props.assignedAdminId,
    decision: props.decision,
    decisionId: props.decisionId,
    openedAt: props.openedAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
    closedAt: toISO(props.closedAt),
    slaDeadlineAt: toISO(props.slaDeadlineAt),
    escalationCount: props.escalationCount,
    metadata: props.metadata,
  }
}

export function toMessageProps(doc: IDisputeMessage): DisputeMessageProps {
  return {
    id: stringId(doc._id) || undefined,
    disputeId: stringId(doc.disputeId)!,
    authorType: doc.authorType,
    authorId: stringId(doc.authorId)!,
    message: doc.message,
    createdAt: doc.createdAt,
    readAt: doc.readAt ?? null,
  }
}

export function toMessageDto(props: DisputeMessageProps): DisputeMessageDto {
  return {
    id: props.id!,
    disputeId: props.disputeId,
    authorType: props.authorType,
    authorId: props.authorId,
    message: props.message,
    createdAt: props.createdAt.toISOString(),
    readAt: toISO(props.readAt),
  }
}

export function toEvidenceProps(doc: IDisputeEvidence): DisputeEvidenceProps {
  return {
    id: stringId(doc._id) || undefined,
    disputeId: stringId(doc.disputeId)!,
    type: doc.type,
    url: doc.url,
    comment: doc.comment ?? null,
    uploadedBy: stringId(doc.uploadedBy)!,
    uploadedByType: doc.uploadedByType,
    createdAt: doc.createdAt,
  }
}

export function toEvidenceDto(props: DisputeEvidenceProps): DisputeEvidenceDto {
  return {
    id: props.id!,
    disputeId: props.disputeId,
    type: props.type,
    url: props.url,
    comment: props.comment,
    uploadedBy: props.uploadedBy,
    uploadedByType: props.uploadedByType,
    createdAt: props.createdAt.toISOString(),
  }
}

export function toHistoryProps(doc: IDisputeHistory): DisputeHistoryProps {
  return {
    id: stringId(doc._id) || undefined,
    disputeId: stringId(doc.disputeId)!,
    action: doc.action,
    oldValue: doc.oldValue ?? null,
    newValue: doc.newValue ?? null,
    performedBy: stringId(doc.performedBy)!,
    performedByType: doc.performedByType,
    performedAt: doc.performedAt,
    metadata: doc.metadata ?? null,
  }
}

export function toHistoryDto(props: DisputeHistoryProps): DisputeHistoryDto {
  return {
    id: props.id!,
    disputeId: props.disputeId,
    action: props.action,
    oldValue: props.oldValue,
    newValue: props.newValue,
    performedBy: props.performedBy,
    performedByType: props.performedByType,
    performedAt: props.performedAt.toISOString(),
    metadata: props.metadata,
  }
}

export function toDecisionProps(doc: IDisputeDecision): DisputeDecisionProps {
  return {
    id: stringId(doc._id) || undefined,
    disputeId: stringId(doc.disputeId)!,
    decision: doc.decision,
    reason: doc.reason,
    adminId: stringId(doc.adminId)!,
    amount: doc.amount ?? null,
    createdAt: doc.createdAt,
    isFinal: doc.isFinal,
  }
}

export function toDecisionDto(props: DisputeDecisionProps): DisputeDecisionDto {
  return {
    id: props.id!,
    disputeId: props.disputeId,
    decision: props.decision,
    reason: props.reason,
    adminId: props.adminId,
    amount: props.amount,
    createdAt: props.createdAt.toISOString(),
    isFinal: props.isFinal,
  }
}
