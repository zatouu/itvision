import type { DisputeStatus, DisputePriority, DisputeReason, DisputeDecision, ActorType } from '../domain/enums'

export interface CreateDisputeDto {
  missionId: string
  clientId: string
  providerId: string
  paymentId?: string | null
  reason: DisputeReason
  description: string
  priority?: DisputePriority
  metadata?: Record<string, unknown>
}

export interface AddMessageDto {
  message: string
}

export interface AddEvidenceDto {
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other'
  url: string
  comment?: string
}

export interface AssignDisputeDto {
  adminId: string
}

export interface RequestEvidenceDto {
  target: 'CLIENT' | 'PROVIDER'
}

export interface TakeDecisionDto {
  decision: DisputeDecision
  reason: string
  amount?: number | null
}

export interface AppealDisputeDto {
  reason: string
}

export interface CloseDisputeDto {
  reason?: string
}

export interface ListDisputeQueryDto {
  page?: number
  limit?: number
  status?: string
  priority?: string
  reason?: string
  clientId?: string
  providerId?: string
  assignedAdminId?: string
  from?: Date
  to?: Date
  sortBy?: 'createdAt' | 'updatedAt' | 'priority'
  sortOrder?: 'asc' | 'desc'
}

export interface DisputeDto {
  id: string
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
  openedAt: string
  updatedAt: string
  closedAt?: string | null
  slaDeadlineAt?: string | null
  escalationCount: number
  metadata?: Record<string, unknown>
}

export interface DisputeMessageDto {
  id: string
  disputeId: string
  authorType: ActorType
  authorId: string
  message: string
  createdAt: string
  readAt?: string | null
}

export interface DisputeEvidenceDto {
  id: string
  disputeId: string
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other'
  url: string
  comment?: string | null
  uploadedBy: string
  uploadedByType: ActorType
  createdAt: string
}

export interface DisputeHistoryDto {
  id: string
  disputeId: string
  action: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  performedBy: string
  performedByType: ActorType
  performedAt: string
  metadata?: Record<string, unknown> | null
}

export interface DisputeDecisionDto {
  id: string
  disputeId: string
  decision: DisputeDecision
  reason: string
  adminId: string
  amount?: number | null
  createdAt: string
  isFinal: boolean
}

export interface DisputeTimelineDto {
  messages: DisputeMessageDto[]
  evidence: DisputeEvidenceDto[]
  history: DisputeHistoryDto[]
  decisions: DisputeDecisionDto[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
