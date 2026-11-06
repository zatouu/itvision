import {
  DisputeStatus,
  DisputePriority,
  DisputeReason,
  DisputeDecision,
  ActorType,
} from '../enums'
import type { Actor, DisputeProps } from '../types'
import { DisputeValidationError, DisputeBusinessError } from '../exception'

const ACTIVE_STATUSES: DisputeStatus[] = [
  DisputeStatus.OPEN,
  DisputeStatus.WAITING_PROVIDER,
  DisputeStatus.WAITING_CLIENT,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.DECIDED,
  DisputeStatus.APPEALED,
]

export class DisputeEntity {
  constructor(private readonly props: DisputeProps) {}

  get id(): string | undefined { return this.props.id }
  get reference(): string { return this.props.reference }
  get missionId(): string { return this.props.missionId }
  get clientId(): string { return this.props.clientId }
  get providerId(): string { return this.props.providerId }
  get paymentId(): string | null | undefined { return this.props.paymentId }
  get status(): DisputeStatus { return this.props.status }
  get priority(): DisputePriority { return this.props.priority }
  get reason(): DisputeReason { return this.props.reason }
  get description(): string { return this.props.description }
  get assignedAdminId(): string | null | undefined { return this.props.assignedAdminId }
  get decision(): DisputeDecision | null | undefined { return this.props.decision }
  get decisionId(): string | null | undefined { return this.props.decisionId }
  get openedAt(): Date { return this.props.openedAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get closedAt(): Date | null | undefined { return this.props.closedAt }
  get slaDeadlineAt(): Date | null | undefined { return this.props.slaDeadlineAt }
  get escalationCount(): number { return this.props.escalationCount }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata }
  get isActive(): boolean { return ACTIVE_STATUSES.includes(this.props.status) }
  get isClosed(): boolean { return this.props.status === DisputeStatus.CLOSED }

  toProps(): DisputeProps { return { ...this.props } }

  withProps(patch: Partial<DisputeProps>): DisputeEntity {
    return new DisputeEntity({ ...this.props, ...patch, updatedAt: new Date() })
  }

  assertCanModify(): void {
    if (this.isClosed) {
      throw new DisputeBusinessError('Le litige est clôturé', 409)
    }
  }

  assertOwnerOrAdmin(actor: Actor): void {
    if (actor.type === ActorType.ADMIN) return
    if (actor.type === ActorType.CLIENT && actor.id === this.props.clientId) return
    if (actor.type === ActorType.PROVIDER && actor.id === this.props.providerId) return
    throw new DisputeBusinessError('Action non autorisée', 403)
  }

  assertAdmin(actor: Actor): void {
    if (actor.type !== ActorType.ADMIN) {
      throw new DisputeBusinessError('Action réservée aux administrateurs', 403)
    }
  }

  assertCanTakeDecision(): void {
    if (this.isClosed) {
      throw new DisputeBusinessError('Impossible de décider sur un litige clôturé', 409)
    }
    if (
      this.props.status !== DisputeStatus.UNDER_REVIEW &&
      this.props.status !== DisputeStatus.APPEALED
    ) {
      throw new DisputeBusinessError(
        'Une décision ne peut être prise qu après examen ou appel',
        409
      )
    }
  }

  assertDecisionNotFinal(decisionIsFinal: boolean): void {
    if (decisionIsFinal) {
      throw new DisputeBusinessError('Une décision validée ne peut pas être modifiée', 409)
    }
  }

  static validateCreate(input: {
    missionId: string
    clientId: string
    providerId: string
    reason: string
    description: string
    priority?: string
  }): void {
    if (!input.missionId?.trim()) throw new DisputeValidationError('missionId requis')
    if (!input.clientId?.trim()) throw new DisputeValidationError('clientId requis')
    if (!input.providerId?.trim()) throw new DisputeValidationError('providerId requis')
    if (!input.reason?.trim()) throw new DisputeValidationError('Raison requise')
    if (!input.description?.trim()) throw new DisputeValidationError('Description requise')
    if (input.description.length > 5000) throw new DisputeValidationError('Description trop longue (max 5000 car.)')
  }
}
