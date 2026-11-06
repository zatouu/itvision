import type { ActorType } from '../domain/enums'
import type { DisputeHistoryProps } from '../domain/types'

export interface AuditRecord {
  disputeId: string
  action: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  performedBy: string
  performedByType: ActorType
  metadata?: Record<string, unknown> | null
}

export interface AuditService {
  record(record: AuditRecord): Promise<DisputeHistoryProps>
}
