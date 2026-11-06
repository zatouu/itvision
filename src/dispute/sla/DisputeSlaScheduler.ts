import { getScheduler } from '@/lib/visibility/scheduler'
import type { DisputeRepository } from '../repository/DisputeRepository'
import type { EventPublisher } from '../event/EventPublisher'
import type { AuditService } from '../audit/AuditService'
import { DisputePriority, ActorType } from '../domain/enums'

export class DisputeSlaScheduler {
  private readonly scheduler = getScheduler()
  private registered = false

  constructor(
    private readonly repository: DisputeRepository,
    private readonly publisher: EventPublisher,
    private readonly auditService: AuditService,
    private readonly escalationPriority = DisputePriority.CRITICAL
  ) {}

  registerHandler(): void {
    if (this.registered) return
    this.registered = true

    this.scheduler.register('dispute_sla', async (task) => {
      const payload = task.payload || {}
      const disputeId = payload.disputeId as string | undefined
      const expectedStatus = payload.status as string | undefined

      if (!disputeId) return

      const entity = await this.repository.findById(disputeId)
      if (!entity || entity.isClosed) return
      if (expectedStatus && entity.status !== expectedStatus) return

      const deadline = entity.slaDeadlineAt
      if (!deadline || new Date(deadline).getTime() > Date.now()) return
      if (entity.escalationCount > 0) return

      const updated = entity.withProps({
        priority: this.escalationPriority,
        escalationCount: entity.escalationCount + 1,
      })
      const saved = await this.repository.save(updated)

      await this.auditService.record({
        disputeId: saved.id!,
        action: 'DISPUTE_ESCALATED',
        oldValue: { priority: entity.priority, escalationCount: entity.escalationCount },
        newValue: { priority: saved.priority, escalationCount: saved.escalationCount },
        performedBy: 'system',
        performedByType: ActorType.SYSTEM,
        metadata: { reason: 'SLA deadline exceeded' },
      })

      this.publisher.publish({
        type: 'DisputeEscalated',
        disputeId: saved.id!,
        newPriority: saved.priority,
        reason: 'SLA deadline exceeded',
      })
    })
  }

  async schedule(disputeId: string, deadline: Date, status: string): Promise<void> {
    await this.scheduler.schedule({
      type: 'dispute_sla',
      requestId: disputeId,
      runAt: deadline,
      payload: { disputeId, status },
    })
  }

  async reschedule(disputeId: string, deadline: Date, status: string): Promise<void> {
    await this.scheduler.cancelForRequest(disputeId, ['dispute_sla'])
    await this.schedule(disputeId, deadline, status)
  }

  async cancel(disputeId: string): Promise<void> {
    await this.scheduler.cancelForRequest(disputeId, ['dispute_sla'])
  }
}
