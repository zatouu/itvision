import type { DisputeEntity } from '../domain/entity'
import type { DisputeStatus, DisputePriority } from '../domain/enums'
import type { DisputeConfig } from '../config/dispute.config'

export interface SlaEngine {
  computeDeadline(status: DisputeStatus, priority: DisputePriority, from: Date): Date
  shouldEscalate(dispute: DisputeEntity): boolean
  escalate(dispute: DisputeEntity): Promise<void>
}

export class DefaultSlaEngine implements SlaEngine {
  constructor(private readonly config: DisputeConfig) {}

  computeDeadline(status: DisputeStatus, priority: DisputePriority, from: Date): Date {
    const statusHours = this.config.sla.hoursByStatus[status]
    const priorityHours = this.config.sla.hoursByPriority[priority]
    const hours = statusHours ?? priorityHours
    return new Date(from.getTime() + hours * 60 * 60 * 1000)
  }

  shouldEscalate(dispute: DisputeEntity): boolean {
    const deadline = dispute.slaDeadlineAt
    if (!deadline) return false
    if (dispute.isClosed || dispute.escalationCount > 0) return false
    return new Date().getTime() > new Date(deadline).getTime()
  }

  async escalate(_dispute: DisputeEntity): Promise<void> {
    // La vraie escalation (workflow + event) est déclenchée par le scheduler
    // qui appelle le service d'escalade.
  }
}
