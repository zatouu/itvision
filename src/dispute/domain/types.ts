import type { DisputeStatus } from './enums/DisputeStatus'
import type { DisputePriority } from './enums/DisputePriority'
import type { DisputeReason } from './enums/DisputeReason'
import type { DisputeDecision } from './enums/DisputeDecision'
import type { ActorType } from './enums/ActorType'

export interface Actor {
  id: string
  type: ActorType
}

export interface DisputeProps {
  id?: string
  reference: string
  missionId: string
  clientId: string
  providerId: string
  paymentId?: string | null
  status: DisputeStatus
  priority: DisputePriority
  reason: DisputeReason
  description: string
  assignedAdminId?: string | null
  decision?: DisputeDecision | null
  decisionId?: string | null
  openedAt: Date
  updatedAt: Date
  closedAt?: Date | null
  slaDeadlineAt?: Date | null
  escalationCount: number
  metadata?: Record<string, unknown>
}

export interface DisputeMessageProps {
  id?: string
  disputeId: string
  authorType: ActorType
  authorId: string
  message: string
  createdAt: Date
  readAt?: Date | null
}

export interface DisputeEvidenceProps {
  id?: string
  disputeId: string
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other'
  url: string
  comment?: string | null
  uploadedBy: string
  uploadedByType: ActorType
  createdAt: Date
}

export interface DisputeHistoryProps {
  id?: string
  disputeId: string
  action: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  performedBy: string
  performedByType: ActorType
  performedAt: Date
  metadata?: Record<string, unknown> | null
}

export interface DisputeDecisionProps {
  id?: string
  disputeId: string
  decision: DisputeDecision
  reason: string
  adminId: string
  amount?: number | null
  createdAt: Date
  isFinal: boolean
}
