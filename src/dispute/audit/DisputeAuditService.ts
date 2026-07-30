import type { AuditService, AuditRecord } from './AuditService'
import type { DisputeRepository } from '../repository/DisputeRepository'
import type { DisputeHistoryProps } from '../domain/types'

export class DisputeAuditService implements AuditService {
  constructor(private readonly repository: DisputeRepository) {}

  async record(record: AuditRecord): Promise<DisputeHistoryProps> {
    return this.repository.addHistory({
      disputeId: record.disputeId,
      action: record.action,
      oldValue: record.oldValue ?? null,
      newValue: record.newValue ?? null,
      performedBy: record.performedBy,
      performedByType: record.performedByType,
      performedAt: new Date(),
      metadata: record.metadata ?? null,
    })
  }
}
