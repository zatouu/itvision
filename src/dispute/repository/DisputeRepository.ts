import type { DisputeEntity } from '../domain/entity'
import type {
  DisputeMessageProps,
  DisputeEvidenceProps,
  DisputeHistoryProps,
  DisputeDecisionProps,
} from '../domain/types'
import type { ListDisputeQueryDto, Paginated } from '../dto'

export interface DisputeRepository {
  findById(id: string): Promise<DisputeEntity | null>
  findByReference(reference: string): Promise<DisputeEntity | null>
  findByMissionId(missionId: string): Promise<DisputeEntity[]>
  findActiveByMissionId(missionId: string): Promise<DisputeEntity | null>
  countActiveByMissionId(missionId: string): Promise<number>
  list(query: ListDisputeQueryDto): Promise<Paginated<DisputeEntity>>
  save(entity: DisputeEntity): Promise<DisputeEntity>

  addMessage(props: DisputeMessageProps): Promise<DisputeMessageProps>
  listMessages(disputeId: string, page?: number, limit?: number): Promise<DisputeMessageProps[]>

  addEvidence(props: DisputeEvidenceProps): Promise<DisputeEvidenceProps>
  listEvidence(disputeId: string): Promise<DisputeEvidenceProps[]>

  addHistory(props: DisputeHistoryProps): Promise<DisputeHistoryProps>
  listHistory(disputeId: string): Promise<DisputeHistoryProps[]>

  addDecision(props: DisputeDecisionProps): Promise<DisputeDecisionProps>
  listDecisions(disputeId: string): Promise<DisputeDecisionProps[]>
  findDecisionById(id: string): Promise<DisputeDecisionProps | null>
}
