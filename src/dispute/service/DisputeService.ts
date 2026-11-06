import type { Actor } from '../domain/types'
import type {
  CreateDisputeDto,
  AddMessageDto,
  AddEvidenceDto,
  RequestEvidenceDto,
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

export interface DisputeService {
  create(dto: CreateDisputeDto, actor: Actor): Promise<DisputeDto>
  list(query: ListDisputeQueryDto, actor: Actor): Promise<Paginated<DisputeDto>>
  getById(id: string, actor: Actor): Promise<DisputeDto | null>
  getTimeline(id: string, actor: Actor): Promise<DisputeTimelineDto>
  addMessage(id: string, dto: AddMessageDto, actor: Actor): Promise<DisputeMessageDto>
  addEvidence(id: string, dto: AddEvidenceDto, actor: Actor): Promise<DisputeEvidenceDto>
  assign(id: string, dto: AssignDisputeDto, actor: Actor): Promise<DisputeDto>
  takeDecision(id: string, dto: TakeDecisionDto, actor: Actor): Promise<DisputeDto>
  appeal(id: string, dto: AppealDisputeDto, actor: Actor): Promise<DisputeDto>
  close(id: string, dto: CloseDisputeDto, actor: Actor): Promise<DisputeDto>
}
