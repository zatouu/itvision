import { DisputeStatus } from '../domain/enums'

/**
 * Graphe des transitions autorisées.
 * Toute transition absente est interdite.
 */
export const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  [DisputeStatus.OPEN]: [
    DisputeStatus.WAITING_PROVIDER,
    DisputeStatus.WAITING_CLIENT,
    DisputeStatus.UNDER_REVIEW,
  ],
  [DisputeStatus.WAITING_PROVIDER]: [
    DisputeStatus.OPEN,
    DisputeStatus.UNDER_REVIEW,
  ],
  [DisputeStatus.WAITING_CLIENT]: [
    DisputeStatus.OPEN,
    DisputeStatus.UNDER_REVIEW,
  ],
  [DisputeStatus.UNDER_REVIEW]: [
    DisputeStatus.DECIDED,
    DisputeStatus.WAITING_PROVIDER,
    DisputeStatus.WAITING_CLIENT,
  ],
  [DisputeStatus.DECIDED]: [
    DisputeStatus.CLOSED,
    DisputeStatus.APPEALED,
  ],
  [DisputeStatus.APPEALED]: [
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.CLOSED,
  ],
  [DisputeStatus.CLOSED]: [],
}

export function isTerminalStatus(status: DisputeStatus): boolean {
  return status === DisputeStatus.CLOSED
}

export function canTransition(from: DisputeStatus, to: DisputeStatus): boolean {
  if (from === to) return true
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}
