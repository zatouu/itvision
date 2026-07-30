import mongoose from 'mongoose'
import { Dispute, DisputeMessage, DisputeEvidence, DisputeHistory, DisputeDecision } from '../model'
import type { DisputeRepository } from './DisputeRepository'
import type { DisputeEntity } from '../domain/entity'
import type {
  DisputeProps,
  DisputeMessageProps,
  DisputeEvidenceProps,
  DisputeHistoryProps,
  DisputeDecisionProps,
} from '../domain/types'
import type { ListDisputeQueryDto, Paginated } from '../dto'
import { DisputeStatus } from '../domain/enums'
import {
  toDisputeEntity,
  toDisputeProps,
  toMessageProps,
  toEvidenceProps,
  toHistoryProps,
  toDecisionProps,
} from '../mapper/DisputeMapper'

const ACTIVE_STATUSES = [
  DisputeStatus.OPEN,
  DisputeStatus.WAITING_PROVIDER,
  DisputeStatus.WAITING_CLIENT,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.DECIDED,
  DisputeStatus.APPEALED,
]

function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id)
}

function fromDocument<T>(doc: any, mapper: (d: any) => T): T {
  return mapper(doc)
}

function propsToDoc(props: DisputeProps): any {
  return {
    reference: props.reference,
    missionId: toObjectId(props.missionId),
    clientId: props.clientId,
    providerId: toObjectId(props.providerId),
    paymentId: props.paymentId ? toObjectId(props.paymentId) : undefined,
    status: props.status,
    priority: props.priority,
    reason: props.reason,
    description: props.description,
    assignedAdminId: props.assignedAdminId ? toObjectId(props.assignedAdminId) : undefined,
    decision: props.decision ?? undefined,
    decisionId: props.decisionId ? toObjectId(props.decisionId) : undefined,
    openedAt: props.openedAt,
    updatedAt: props.updatedAt,
    closedAt: props.closedAt ?? undefined,
    slaDeadlineAt: props.slaDeadlineAt ?? undefined,
    escalationCount: props.escalationCount,
    metadata: props.metadata,
  }
}

export class MongooseDisputeRepository implements DisputeRepository {
  async findById(id: string): Promise<DisputeEntity | null> {
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await Dispute.findById(id).lean()
    return doc ? toDisputeEntity(doc as any) : null
  }

  async findByReference(reference: string): Promise<DisputeEntity | null> {
    const doc = await Dispute.findOne({ reference: reference.toUpperCase() }).lean()
    return doc ? toDisputeEntity(doc as any) : null
  }

  async findByMissionId(missionId: string): Promise<DisputeEntity[]> {
    if (!mongoose.isValidObjectId(missionId)) return []
    const docs = await Dispute.find({ missionId: toObjectId(missionId) })
      .sort({ openedAt: -1 })
      .lean()
    return docs.map((d) => toDisputeEntity(d as any))
  }

  async findActiveByMissionId(missionId: string): Promise<DisputeEntity | null> {
    if (!mongoose.isValidObjectId(missionId)) return null
    const doc = await Dispute.findOne({
      missionId: toObjectId(missionId),
      status: { $in: ACTIVE_STATUSES },
    })
      .sort({ openedAt: -1 })
      .lean()
    return doc ? toDisputeEntity(doc as any) : null
  }

  async countActiveByMissionId(missionId: string): Promise<number> {
    if (!mongoose.isValidObjectId(missionId)) return 0
    return Dispute.countDocuments({
      missionId: toObjectId(missionId),
      status: { $in: ACTIVE_STATUSES },
    })
  }

  async list(query: ListDisputeQueryDto): Promise<Paginated<DisputeEntity>> {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 20, 100)
    const skip = (page - 1) * limit

    const filter: any = {}
    if (query.status) filter.status = query.status
    if (query.priority) filter.priority = query.priority
    if (query.reason) filter.reason = query.reason
    if (query.clientId) filter.clientId = query.clientId
    if (query.providerId && mongoose.isValidObjectId(query.providerId)) {
      filter.providerId = toObjectId(query.providerId)
    }
    if (query.assignedAdminId && mongoose.isValidObjectId(query.assignedAdminId)) {
      filter.assignedAdminId = toObjectId(query.assignedAdminId)
    }
    if (query.from || query.to) {
      filter.openedAt = {}
      if (query.from) filter.openedAt.$gte = new Date(query.from)
      if (query.to) filter.openedAt.$lte = new Date(query.to)
    }

    const sortField =
      query.sortBy === 'priority'
        ? 'priority'
        : query.sortBy === 'updatedAt'
        ? 'updatedAt'
        : 'openedAt'
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1

    const [docs, total] = await Promise.all([
      Dispute.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit).lean(),
      Dispute.countDocuments(filter),
    ])

    return {
      items: docs.map((d) => toDisputeEntity(d as any)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async save(entity: DisputeEntity): Promise<DisputeEntity> {
    const props = entity.toProps()
    const docPayload = propsToDoc(props)

    if (props.id) {
      const updated = await Dispute.findByIdAndUpdate(
        props.id,
        { $set: docPayload },
        { new: true, runValidators: true }
      ).lean()
      if (!updated) throw new Error(`Dispute ${props.id} non trouvée`)
      return toDisputeEntity(updated as any)
    }

    const created = await Dispute.create(docPayload)
    return toDisputeEntity(created.toObject())
  }

  async addMessage(props: DisputeMessageProps): Promise<DisputeMessageProps> {
    const created = await DisputeMessage.create({
      disputeId: toObjectId(props.disputeId),
      authorType: props.authorType,
      authorId: toObjectId(props.authorId),
      message: props.message,
      createdAt: props.createdAt,
      readAt: props.readAt ?? undefined,
    })
    return toMessageProps(created.toObject())
  }

  async listMessages(
    disputeId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<DisputeMessageProps[]> {
    if (!mongoose.isValidObjectId(disputeId)) return []
    const skip = (page - 1) * limit
    const docs = await DisputeMessage.find({ disputeId: toObjectId(disputeId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    return docs.map((d) => toMessageProps(d as any))
  }

  async addEvidence(props: DisputeEvidenceProps): Promise<DisputeEvidenceProps> {
    const created = await DisputeEvidence.create({
      disputeId: toObjectId(props.disputeId),
      type: props.type,
      url: props.url,
      comment: props.comment ?? undefined,
      uploadedBy: toObjectId(props.uploadedBy),
      uploadedByType: props.uploadedByType,
      createdAt: props.createdAt,
    })
    return toEvidenceProps(created.toObject())
  }

  async listEvidence(disputeId: string): Promise<DisputeEvidenceProps[]> {
    if (!mongoose.isValidObjectId(disputeId)) return []
    const docs = await DisputeEvidence.find({ disputeId: toObjectId(disputeId) })
      .sort({ createdAt: -1 })
      .lean()
    return docs.map((d) => toEvidenceProps(d as any))
  }

  async addHistory(props: DisputeHistoryProps): Promise<DisputeHistoryProps> {
    const created = await DisputeHistory.create({
      disputeId: toObjectId(props.disputeId),
      action: props.action,
      oldValue: props.oldValue ?? undefined,
      newValue: props.newValue ?? undefined,
      performedBy: toObjectId(props.performedBy),
      performedByType: props.performedByType,
      performedAt: props.performedAt,
      metadata: props.metadata ?? undefined,
    })
    return toHistoryProps(created.toObject())
  }

  async listHistory(disputeId: string): Promise<DisputeHistoryProps[]> {
    if (!mongoose.isValidObjectId(disputeId)) return []
    const docs = await DisputeHistory.find({ disputeId: toObjectId(disputeId) })
      .sort({ performedAt: -1 })
      .lean()
    return docs.map((d) => toHistoryProps(d as any))
  }

  async addDecision(props: DisputeDecisionProps): Promise<DisputeDecisionProps> {
    const created = await DisputeDecision.create({
      _id: props.id ? toObjectId(props.id) : undefined,
      disputeId: toObjectId(props.disputeId),
      decision: props.decision,
      reason: props.reason,
      adminId: toObjectId(props.adminId),
      amount: props.amount ?? undefined,
      createdAt: props.createdAt,
      isFinal: props.isFinal,
    })
    return toDecisionProps(created.toObject())
  }

  async listDecisions(disputeId: string): Promise<DisputeDecisionProps[]> {
    if (!mongoose.isValidObjectId(disputeId)) return []
    const docs = await DisputeDecision.find({ disputeId: toObjectId(disputeId) })
      .sort({ createdAt: -1 })
      .lean()
    return docs.map((d) => toDecisionProps(d as any))
  }

  async findDecisionById(id: string): Promise<DisputeDecisionProps | null> {
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await DisputeDecision.findById(id).lean()
    return doc ? toDecisionProps(doc as any) : null
  }
}
