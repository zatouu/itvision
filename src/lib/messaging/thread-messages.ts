import type { Model } from 'mongoose'
import MarketMessage from '@/lib/models/MarketMessage'
import XeuyMessage from '@/lib/models/XeuyMessage'
import SharedMessage from '@/lib/models/SharedMessage'
import {
  THREAD_DOMAIN,
  ATTACHMENT_TYPES,
  type IThreadMessage,
  type MessageAttachment,
  type MessageDomain,
  type ThreadType,
} from '@/lib/messaging/thread-message-schema'
import { publishThreadEvent } from '@/lib/messaging/message-events'

export type { ThreadType, MessageDomain, MessageAttachment } from '@/lib/messaging/thread-message-schema'

const MODELS: Record<MessageDomain, Model<IThreadMessage>> = {
  market: MarketMessage,
  xeuy: XeuyMessage,
  shared: SharedMessage,
}

/** Modèle (et donc collection) propre au domaine du fil. */
export function messageModelFor(threadType: ThreadType): Model<IThreadMessage> {
  return MODELS[THREAD_DOMAIN[threadType]]
}

export const MESSAGE_MAX_LENGTH: Record<ThreadType, number> = {
  conversation: 5000,
  mission: 1000,
  mission_dispute: 2000,
  order: 2000,
  group_order: 2000,
  dispute_case: 5000,
}

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500
const MAX_ATTACHMENTS = 5
// Seuls les fichiers servis par notre upload sont acceptés (pas d'URL externe arbitraire)
const INTERNAL_UPLOAD_URL = /^\/(api\/)?uploads\/[\w\-/.]+$/
// Fils à deux parties : le statut « lu » se résume à une date sur le message
const TWO_PARTY_THREADS: ThreadType[] = ['mission', 'order']

export type ThreadMessageDoc = Pick<
  IThreadMessage,
  | 'threadType' | 'threadId' | 'senderId' | 'senderRole' | 'senderName' | 'senderParticipantId'
  | 'text' | 'attachments' | 'systemEvent' | 'isInternal' | 'readAt' | 'readBy' | 'createdAt' | 'updatedAt'
> & { _id: unknown }

export interface PostMessageInput {
  threadType: ThreadType
  threadId: string
  senderId?: string | null
  senderRole: string
  senderName?: string
  senderParticipantId?: string
  text: unknown
  attachments?: unknown
  systemEvent?: string
  isInternal?: boolean
}

export class EmptyMessageError extends Error {
  constructor() {
    super('Message vide')
    this.name = 'EmptyMessageError'
  }
}

/** Texte nettoyé et tronqué à la longueur autorisée pour ce type de fil ('' si invalide). */
export function normalizeMessageText(threadType: ThreadType, raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, MESSAGE_MAX_LENGTH[threadType])
}

/** Pièces jointes valides uniquement (type connu, fichier issu de notre upload), 5 max. */
export function sanitizeAttachments(raw: unknown): MessageAttachment[] {
  if (!Array.isArray(raw)) return []
  const result: MessageAttachment[] = []
  for (const item of raw) {
    if (result.length >= MAX_ATTACHMENTS) break
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const type = String(a.type) as MessageAttachment['type']
    const url = typeof a.url === 'string' ? a.url.trim() : ''
    if (!(ATTACHMENT_TYPES as readonly string[]).includes(type)) continue
    if (!INTERNAL_UPLOAD_URL.test(url) || url.includes('..')) continue
    result.push({
      type,
      url,
      name: typeof a.name === 'string' ? a.name.slice(0, 200) : undefined,
      mimeType: typeof a.mimeType === 'string' ? a.mimeType.slice(0, 100) : undefined,
      size: Number.isFinite(Number(a.size)) ? Number(a.size) : undefined,
      durationSec: Number.isFinite(Number(a.durationSec)) ? Number(a.durationSec) : undefined,
    })
  }
  return result
}

export async function postMessage(input: PostMessageInput): Promise<ThreadMessageDoc> {
  const text = normalizeMessageText(input.threadType, input.text)
  const attachments = sanitizeAttachments(input.attachments)
  if (!text && attachments.length === 0) throw new EmptyMessageError()
  const created = await messageModelFor(input.threadType).create({
    threadType: input.threadType,
    threadId: String(input.threadId),
    senderId: input.senderId ? String(input.senderId) : undefined,
    senderRole: input.senderRole,
    senderName: input.senderName,
    senderParticipantId: input.senderParticipantId,
    text,
    attachments,
    systemEvent: input.systemEvent,
    isInternal: !!input.isInternal,
  })
  const doc = created.toObject() as ThreadMessageDoc
  if (!doc.isInternal) publishThreadEvent(input.threadType, doc.threadId, { kind: 'message', message: doc })
  return doc
}

/**
 * Marque comme lus les messages reçus par `readerId` dans un fil.
 * `senderRoles` restreint aux messages de l'autre partie quand le lecteur n'a pas d'identifiant (invité).
 * Renvoie le nombre de messages nouvellement lus (0 si rien à faire).
 */
export async function markThreadRead(
  threadType: ThreadType,
  threadId: string,
  readerId: string,
  opts: { senderRoles?: string[] } = {}
): Promise<number> {
  const model = messageModelFor(threadType)
  const now = new Date()
  const base: Record<string, unknown> = {
    threadType,
    threadId: String(threadId),
    senderId: { $ne: String(readerId) },
    isInternal: { $ne: true },
  }
  if (opts.senderRoles?.length) base.senderRole = { $in: opts.senderRoles }
  const res = await model.updateMany(
    { ...base, 'readBy.userId': { $ne: String(readerId) } },
    { $push: { readBy: { userId: String(readerId), at: now } } }
  )
  if (TWO_PARTY_THREADS.includes(threadType)) {
    await model.updateMany({ ...base, readAt: { $exists: false } }, { $set: { readAt: now } })
  }
  if (res.modifiedCount > 0) {
    publishThreadEvent(threadType, threadId, { kind: 'read', readerId: String(readerId), at: now })
  }
  return res.modifiedCount
}

export interface ListMessagesOptions {
  limit?: number
  /** Messages strictement antérieurs (pagination vers le passé). */
  before?: Date | null
  /** Messages strictement postérieurs (flux temps réel / polling). */
  after?: Date | null
  includeInternal?: boolean
}

/**
 * Messages d'un fil, toujours renvoyés du plus ancien au plus récent.
 * Sans `after`, ce sont les `limit` messages les plus récents (et non les plus anciens).
 */
export async function listThreadMessages(
  threadType: ThreadType,
  threadId: string,
  opts: ListMessagesOptions = {}
): Promise<ThreadMessageDoc[]> {
  const model = messageModelFor(threadType)
  const limit = Math.min(Math.max(Math.floor(opts.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT)
  const query: Record<string, unknown> = { threadType, threadId: String(threadId) }
  if (!opts.includeInternal) query.isInternal = { $ne: true }

  if (opts.after) {
    query.createdAt = { $gt: opts.after }
    return (await model.find(query).sort({ createdAt: 1 }).limit(limit).lean()) as ThreadMessageDoc[]
  }

  if (opts.before && !Number.isNaN(opts.before.getTime())) query.createdAt = { $lt: opts.before }
  const docs = (await model.find(query).sort({ createdAt: -1 }).limit(limit).lean()) as ThreadMessageDoc[]
  return docs.reverse()
}

/** Derniers messages d'un rôle donné sur un type de fil (ex. file support admin). */
export async function listRecentMessagesByRole(threadType: ThreadType, senderRole: string, limit = 20): Promise<ThreadMessageDoc[]> {
  return (await messageModelFor(threadType)
    .find({ threadType, senderRole })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), MAX_LIMIT))
    .lean()) as ThreadMessageDoc[]
}

export async function threadHasMessages(threadType: ThreadType, threadId: string): Promise<boolean> {
  return !!(await messageModelFor(threadType).exists({ threadType, threadId: String(threadId) }))
}

/** Dernier message et dates des messages reçus (hors expéditeur) pour une liste de fils. */
export async function getThreadsSummary(threadType: ThreadType, threadIds: string[], viewerId: string) {
  const model = messageModelFor(threadType)
  const ids = threadIds.map(String)
  const [lastMsgs, receivedAgg] = await Promise.all([
    model.aggregate([
      { $match: { threadType, threadId: { $in: ids }, isInternal: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$threadId', last: { $first: '$$ROOT' } } },
    ]),
    model.aggregate([
      { $match: { threadType, threadId: { $in: ids }, isInternal: { $ne: true }, senderId: { $ne: String(viewerId) } } },
      { $group: { _id: '$threadId', dates: { $push: '$createdAt' } } },
    ]),
  ])
  return {
    lastByThread: new Map<string, ThreadMessageDoc>(lastMsgs.map((m: any) => [String(m._id), m.last])),
    receivedDatesByThread: new Map<string, Date[]>(receivedAgg.map((r: any) => [String(r._id), r.dates])),
  }
}

// ─── Opérations RGPD : seules opérations volontairement transverses aux domaines ───

/** Messages envoyés par un utilisateur, toutes apps confondues (export de données). */
export async function listMessagesBySender(senderId: string, limitPerDomain = 1000) {
  const perDomain = await Promise.all(
    Object.values(MODELS).map((model) =>
      model.find({ senderId: String(senderId), isInternal: { $ne: true } })
        .select('threadType threadId senderRole text createdAt')
        .sort({ createdAt: -1 })
        .limit(limitPerDomain)
        .lean()
    )
  )
  return perDomain.flat().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** Retire le nom d'auteur des messages d'un compte supprimé (le contenu reste visible par l'autre partie). */
export async function anonymizeMessageSender(senderId: string) {
  await Promise.all(
    Object.values(MODELS).map((model) =>
      model.updateMany(
        { senderId: String(senderId), senderName: { $exists: true } },
        { $set: { senderName: 'Utilisateur supprimé' } }
      )
    )
  )
}

// ─── Formats de réponse historiques (compatibilité apps web et mobile) ───────
// Les champs ajoutés (attachments, systemEvent, readAt, readBy) sont facultatifs pour les anciennes versions.

const richFields = (m: ThreadMessageDoc) => ({
  attachments: m.attachments || [],
  ...(m.systemEvent ? { systemEvent: m.systemEvent } : {}),
})

/** Chat de mission et messages de litige de mission. */
export function toMissionMessageDto(m: ThreadMessageDoc) {
  return {
    _id: String(m._id),
    requestId: m.threadId,
    senderId: m.senderId,
    senderRole: m.senderRole,
    text: m.text,
    createdAt: m.createdAt,
    readAt: m.readAt || null,
    ...richFields(m),
  }
}

export function toOrderMessageDto(m: ThreadMessageDoc) {
  return {
    _id: String(m._id),
    orderId: m.threadId,
    orderReference: m.threadId,
    senderId: m.senderId,
    senderRole: m.senderRole,
    senderName: m.senderName,
    text: m.text,
    isInternal: m.isInternal,
    readAt: m.readAt,
    createdAt: m.createdAt,
    ...richFields(m),
  }
}

export function toGroupOrderMessageDto(m: ThreadMessageDoc) {
  return {
    id: String(m._id),
    groupId: m.threadId,
    authorType: m.senderRole,
    authorParticipantId: m.senderParticipantId || null,
    authorName: m.senderName,
    text: m.text,
    createdAt: m.createdAt,
    ...richFields(m),
  }
}

export function toConversationMessageDto(m: ThreadMessageDoc) {
  return {
    id: String(m._id),
    conversationId: m.threadId,
    senderId: String(m.senderId || ''),
    senderRole: String(m.senderRole || ''),
    text: String(m.text || ''),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    readBy: (m.readBy || []).map((r) => ({ userId: r.userId, at: r.at })),
    ...richFields(m),
  }
}
