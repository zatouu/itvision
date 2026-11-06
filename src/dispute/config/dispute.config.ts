import { DisputePriority, DisputeStatus } from '../domain/enums'

export interface SlaConfig {
  hoursByPriority: Record<DisputePriority, number>
  hoursByStatus: Partial<Record<DisputeStatus, number>>
}

export interface AppealConfig {
  windowHours: number
}

export interface DisputeConfig {
  sla: SlaConfig
  appeal: AppealConfig
}

export const defaultDisputeConfig: DisputeConfig = {
  sla: {
    hoursByPriority: {
      [DisputePriority.LOW]: 72,
      [DisputePriority.NORMAL]: 48,
      [DisputePriority.HIGH]: 24,
      [DisputePriority.CRITICAL]: 4,
    },
    hoursByStatus: {
      [DisputeStatus.OPEN]: 48,
      [DisputeStatus.WAITING_PROVIDER]: 48,
      [DisputeStatus.WAITING_CLIENT]: 48,
    },
  },
  appeal: {
    windowHours: 7 * 24, // 7 jours
  },
}

export function getDisputeConfig(): DisputeConfig {
  return defaultDisputeConfig
}
