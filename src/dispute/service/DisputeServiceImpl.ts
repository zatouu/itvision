import mongoose from 'mongoose'
import { z } from 'zod'
import type { DisputeService } from './DisputeService'
import type { DisputeRepository } from '../repository/DisputeRepository'
import type { DisputeWorkflowEngine } from '../workflow/DisputeWorkflowEngine'
import type { EventPublisher } from '../event/EventPublisher'
import type { AuditService } from '../audit/AuditService'
import type { SlaEngine } from '../sla/SlaEngine'
import type { MissionPort } from '../port/MissionPort'
import type { EscrowPort } from '../port/EscrowPort'
import type { DisputeSlaScheduler } from '../sla/DisputeSlaScheduler'
import type { Actor } from '../domain/types'
import { DisputeEntity } from '../domain/entity'
import { ActorType, DisputeStatus, DisputeReason, DisputePriority, DisputeDecision } from '../domain/enums'
import { DisputeValidationError, DisputeBusinessError, DisputeError } from '../domain/exception'
import {
  createDisputeSchema,
  addMessageSchema,
  addEvidenceSchema,
  assignDisputeSchema,
  takeDecisionSchema,
  appealDisputeSchema,
  closeDisputeSchema,
  listDisputeQuerySchema,
} from '../validation/schemas'
import type {
  CreateDisputeDto,
  AddMessageDto,
  AddEvidenceDto,
  AssignDisputeDto,
  TakeDecisionDto,
  AppealDisputeDto,
  CloseDisputeDto,
  ListDisputeQueryDto,
  DisputeDto,
  DisputeMessageDto,
  DisputeEvidenceDto,
  DisputeTimelineDto,
  Paginated,
} from '../dto'
import {
  toDisputeDto,
  toMessageDto,
  toEvidenceDto,
  toHistoryDto,
  toDecisionDto,
} from '../mapper/DisputeMapper'

function mapActorType(role: string): ActorType {
  const r = role.toUpperCase()
  if (r === 'ADMIN') return ActorType.ADMIN
  if (r === 'PROVIDER') return ActorType.PROVIDER
  if (r === 'CLIENT') return ActorType.CLIENT
  return ActorType.SYSTEM
}

function parseZod<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (err: any) {
    const issues = err?.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
    throw new DisputeValidationError(issues || err?.message || 'Validation invalide')
  }
}

export class DisputeServiceImpl implements DisputeService {
  constructor(
    private readonly repository: DisputeRepository,
    private readonly workflowEngine: DisputeWorkflowEngine,
    private readonly eventPublisher: EventPublisher,
    private readonly auditService: AuditService,
    private readonly slaEngine: SlaEngine,
    private readonly missionPort: MissionPort,
    private readonly escrowPort: EscrowPort,
    private readonly slaScheduler: DisputeSlaScheduler
  ) {}

  private async applySlaAndSave(
    entity: DisputeEntity,
    active = true
  ): Promise<DisputeEntity> {
    if (active) {
      const deadline = this.slaEngine.computeDeadline(entity.status, entity.priority, new Date())
      const withSla = entity.withProps({ slaDeadlineAt: deadline })
      const saved = await this.repository.save(withSla)
      await this.slaScheduler.reschedule(saved.id!, saved.slaDeadlineAt!, saved.status)
      return saved
    }
    const saved = await this.repository.save(entity)
    await this.slaScheduler.cancel(saved.id!)
    return saved
  }

  async create(dto: CreateDisputeDto, actor: Actor): Promise<DisputeDto> {
    const valid = parseZod(createDisputeSchema, dto)

    if (actor.type === ActorType.CLIENT && actor.id !== valid.clientId) {
      throw new DisputeBusinessError('Vous ne pouvez ouvrir un litige qu\'en votre nom', 403)
    }

    const [missionStatus, activeCount, paymentId] = await Promise.all([
      this.missionPort.getMissionStatus(valid.missionId),
      this.repository.countActiveByMissionId(valid.missionId),
      valid.paymentId ? Promise.resolve(valid.paymentId) : this.escrowPort.getPaymentIdForMission(valid.missionId),
    ])

    if (!missionStatus) {
      throw new DisputeBusinessError('Mission introuvable', 404)
    }

    const missionProviderId = await this.missionPort.getMissionProviderId(valid.missionId)
    if (missionProviderId && missionProviderId !== valid.providerId) {
      throw new DisputeBusinessError('Prestataire invalide pour cette mission', 400)
    }

    const result = this.workflowEngine.open(
      {
        missionId: valid.missionId,
        clientId: valid.clientId,
        providerId: valid.providerId,
        paymentId: paymentId || null,
        reason: valid.reason as DisputeReason,
        description: valid.description,
        priority: valid.priority as DisputePriority,
        metadata: valid.metadata,
      },
      actor,
      { missionStatus, activeDisputeCount: activeCount, paymentId: paymentId || null }
    )

    const saved = await this.applySlaAndSave(result.entity)

    await this.auditService.record({
      disputeId: saved.id!,
      action: 'DISPUTE_CREATED',
      newValue: { status: saved.status, reason: saved.reason, priority: saved.priority },
      performedBy: actor.id,
      performedByType: actor.type,
    })

    this.publishEvents(result.events)

    return toDisputeDto(saved)
  }

  async list(query: ListDisputeQueryDto, actor: Actor): Promise<Paginated<DisputeDto>> {
    const valid = parseZod(listDisputeQuerySchema, query)

    if (actor.type === ActorType.CLIENT) {
      valid.clientId = actor.id
    } else if (actor.type === ActorType.PROVIDER) {
      valid.providerId = actor.id
    }

    const page = valid.page ?? 1
    const limit = valid.limit ?? 20

    const result = await this.repository.list({ ...(valid as ListDisputeQueryDto), page, limit })
    return {
      ...result,
      items: result.items.map((e) => toDisputeDto(e)),
    }
  }

  async getById(id: string, actor: Actor): Promise<DisputeDto | null> {
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) return null
    return toDisputeDto(entity)
  }

  async getTimeline(id: string, actor: Actor): Promise<DisputeTimelineDto> {
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) throw new DisputeBusinessError('Litige introuvable', 404)

    const [messages, evidence, history, decisions] = await Promise.all([
      this.repository.listMessages(id, 1, 100),
      this.repository.listEvidence(id),
      this.repository.listHistory(id),
      this.repository.listDecisions(id),
    ])

    return {
      messages: messages.map(toMessageDto),
      evidence: evidence.map(toEvidenceDto),
      history: history.map(toHistoryDto),
      decisions: decisions.map(toDecisionDto),
    }
  }

  async addMessage(id: string, dto: AddMessageDto, actor: Actor): Promise<DisputeMessageDto> {
    const valid = parseZod(addMessageSchema, dto)
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) throw new DisputeBusinessError('Litige introuvable', 404)

    entity.assertCanModify()

    const message = await this.repository.addMessage({
      disputeId: id,
      authorType: actor.type,
      authorId: actor.id,
      message: valid.message,
      createdAt: new Date(),
      readAt: null,
    })

    await this.auditService.record({
      disputeId: id,
      action: 'MESSAGE_SENT',
      newValue: { messageId: message.id, authorType: actor.type },
      performedBy: actor.id,
      performedByType: actor.type,
    })

    this.eventPublisher.publish({
      type: 'DisputeMessageSent',
      disputeId: id,
      messageId: message.id,
      actor,
    })

    const isExpectedResponder =
      (actor.type === ActorType.PROVIDER && entity.status === DisputeStatus.WAITING_PROVIDER) ||
      (actor.type === ActorType.CLIENT && entity.status === DisputeStatus.WAITING_CLIENT)

    if (isExpectedResponder) {
      const result = this.workflowEngine.reply(entity, actor, valid.message, false)
      const saved = await this.applySlaAndSave(result.entity)
      await this.recordStateChange(entity, saved, actor, 'REPLY_RECEIVED')
      this.publishEvents(result.events)
    }

    return toMessageDto(message)
  }

  async addEvidence(
    id: string,
    dto: AddEvidenceDto,
    actor: Actor
  ): Promise<DisputeEvidenceDto> {
    const valid = parseZod(addEvidenceSchema, dto)
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) throw new DisputeBusinessError('Litige introuvable', 404)

    entity.assertCanModify()

    const evidence = await this.repository.addEvidence({
      disputeId: id,
      type: valid.type,
      url: valid.url,
      comment: valid.comment ?? null,
      uploadedBy: actor.id,
      uploadedByType: actor.type,
      createdAt: new Date(),
    })

    await this.auditService.record({
      disputeId: id,
      action: 'EVIDENCE_ADDED',
      newValue: { evidenceId: evidence.id, type: valid.type },
      performedBy: actor.id,
      performedByType: actor.type,
    })

    this.eventPublisher.publish({
      type: 'DisputeEvidenceAdded',
      disputeId: id,
      evidenceId: evidence.id,
      actor,
    })

    const isExpectedResponder =
      (actor.type === ActorType.PROVIDER && entity.status === DisputeStatus.WAITING_PROVIDER) ||
      (actor.type === ActorType.CLIENT && entity.status === DisputeStatus.WAITING_CLIENT)

    if (isExpectedResponder) {
      const result = this.workflowEngine.reply(entity, actor, 'Preuve ajoutée', true)
      const saved = await this.applySlaAndSave(result.entity)
      await this.recordStateChange(entity, saved, actor, 'EVIDENCE_SUBMITTED')
      this.publishEvents(result.events)
    }

    return toEvidenceDto(evidence)
  }

  async assign(id: string, dto: AssignDisputeDto, actor: Actor): Promise<DisputeDto> {
    const valid = parseZod(assignDisputeSchema, dto)
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) throw new DisputeBusinessError('Litige introuvable', 404)

    const result = this.workflowEngine.assign(entity, valid.adminId, actor)
    const saved = await this.applySlaAndSave(result.entity)

    await this.auditService.record({
      disputeId: id,
      action: 'ASSIGNMENT_CHANGED',
      oldValue: { assignedAdminId: entity.assignedAdminId },
      newValue: { assignedAdminId: saved.assignedAdminId },
      performedBy: actor.id,
      performedByType: actor.type,
    })

    this.publishEvents(result.events)
    return toDisputeDto(saved)
  }

  async takeDecision(id: string, dto: TakeDecisionDto, actor: Actor): Promise<DisputeDto> {
    const valid = parseZod(takeDecisionSchema, dto)
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) throw new DisputeBusinessError('Litige introuvable', 404)

    if (actor.type !== ActorType.ADMIN) {
      throw new DisputeBusinessError('Action réservée aux administrateurs', 403)
    }

    const decisionId = new mongoose.Types.ObjectId().toString()

    const result = this.workflowEngine.takeDecision(
      entity,
      {
        decisionId,
        decision: valid.decision as DisputeDecision,
        reason: valid.reason,
        adminId: actor.id,
        amount: valid.amount ?? null,
      },
      actor
    )

    const saved = await this.applySlaAndSave(result.entity)

    await this.repository.addDecision({
      id: decisionId,
      disputeId: id,
      decision: valid.decision as DisputeDecision,
      reason: valid.reason,
      adminId: actor.id,
      amount: valid.amount ?? null,
      createdAt: new Date(),
      isFinal: true,
    })

    await this.auditService.record({
      disputeId: id,
      action: 'DECISION_TAKEN',
      oldValue: { status: entity.status, decision: entity.decision },
      newValue: { status: saved.status, decision: saved.decision, decisionId },
      performedBy: actor.id,
      performedByType: actor.type,
    })

    this.publishEvents(result.events)
    return toDisputeDto(saved)
  }

  async appeal(id: string, dto: AppealDisputeDto, actor: Actor): Promise<DisputeDto> {
    const valid = parseZod(appealDisputeSchema, dto)
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) throw new DisputeBusinessError('Litige introuvable', 404)

    const result = this.workflowEngine.appeal(entity, valid.reason, actor)
    const saved = await this.applySlaAndSave(result.entity)

    await this.auditService.record({
      disputeId: id,
      action: 'DISPUTE_APPEALED',
      oldValue: { status: entity.status },
      newValue: { status: saved.status },
      performedBy: actor.id,
      performedByType: actor.type,
    })

    this.publishEvents(result.events)
    return toDisputeDto(saved)
  }

  async close(id: string, dto: CloseDisputeDto, actor: Actor): Promise<DisputeDto> {
    parseZod(closeDisputeSchema, dto)
    const entity = await this.loadAndAuthorize(id, actor)
    if (!entity) throw new DisputeBusinessError('Litige introuvable', 404)

    if (actor.type !== ActorType.ADMIN) {
      throw new DisputeBusinessError('Action réservée aux administrateurs', 403)
    }

    const result = this.workflowEngine.close(entity, actor)
    const saved = await this.applySlaAndSave(result.entity, false)

    await this.auditService.record({
      disputeId: id,
      action: 'DISPUTE_CLOSED',
      oldValue: { status: entity.status, closedAt: entity.closedAt },
      newValue: { status: saved.status, closedAt: saved.closedAt },
      performedBy: actor.id,
      performedByType: actor.type,
      metadata: { reason: dto.reason },
    })

    this.publishEvents(result.events)
    return toDisputeDto(saved)
  }

  private async loadAndAuthorize(
    id: string,
    actor: Actor
  ): Promise<DisputeEntity | null> {
    const entity = await this.repository.findById(id)
    if (!entity) return null

    if (actor.type === ActorType.ADMIN) return entity
    if (actor.type === ActorType.CLIENT && actor.id === entity.clientId) return entity
    if (actor.type === ActorType.PROVIDER && actor.id === entity.providerId) return entity

    throw new DisputeBusinessError('Accès refusé à ce litige', 403)
  }

  private async recordStateChange(
    previous: DisputeEntity,
    next: DisputeEntity,
    actor: Actor,
    action: string
  ): Promise<void> {
    if (previous.status === next.status) return
    await this.auditService.record({
      disputeId: next.id!,
      action,
      oldValue: { status: previous.status },
      newValue: { status: next.status },
      performedBy: actor.id,
      performedByType: actor.type,
    })
  }

  private publishEvents(events: { type: string; [key: string]: any }[]): void {
    for (const event of events) {
      this.eventPublisher.publish(event)
    }
  }
}
