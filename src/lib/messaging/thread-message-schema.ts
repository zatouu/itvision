import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Schéma commun des messageries, instancié dans une collection par domaine
 * (cf. src/lib/domains.ts) pour permettre de séparer une app sans tri de données.
 */
export const THREAD_DOMAIN = {
  conversation: 'shared',      // messagerie directe (threadId = Conversation._id)
  order: 'market',             // support commande DDM+ (threadId = Order.orderId)
  group_order: 'market',       // chat d'achat groupé (threadId = GroupOrder.groupId)
  mission: 'xeuy',             // chat client ↔ prestataire (threadId = ServiceRequest._id)
  mission_dispute: 'xeuy',     // litige de mission (threadId = ServiceRequest._id)
  dispute_case: 'xeuy',        // module src/dispute (threadId = Dispute._id)
} as const

export type ThreadType = keyof typeof THREAD_DOMAIN
export type MessageDomain = (typeof THREAD_DOMAIN)[ThreadType]

export const MESSAGE_COLLECTIONS: Record<MessageDomain, string> = {
  market: 'market_messages',
  xeuy: 'xeuy_messages',
  shared: 'shared_messages',
}

export const ATTACHMENT_TYPES = ['image', 'audio', 'video', 'file'] as const
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number]

export interface MessageAttachment {
  type: AttachmentType
  url: string
  name?: string
  mimeType?: string
  size?: number
  durationSec?: number
}

export interface MessageReadReceipt {
  userId: string
  at: Date
}

export interface IThreadMessage extends Document {
  threadType: ThreadType
  threadId: string
  senderId?: string
  senderRole: string
  senderName?: string
  senderParticipantId?: string
  text: string
  attachments: MessageAttachment[]
  /** Clé d'événement des messages système (ex. 'mission:arrived'), pour un rendu spécifique côté app. */
  systemEvent?: string
  isInternal: boolean
  readAt?: Date
  readBy: MessageReadReceipt[]
  legacySource?: string
  createdAt: Date
  updatedAt: Date
}

export function threadTypesOf(domain: MessageDomain): ThreadType[] {
  return (Object.keys(THREAD_DOMAIN) as ThreadType[]).filter((t) => THREAD_DOMAIN[t] === domain)
}

export function createThreadMessageModel(modelName: string, domain: MessageDomain): Model<IThreadMessage> {
  const existing = mongoose.models[modelName] as Model<IThreadMessage> | undefined
  if (existing) return existing

  const schema = new Schema<IThreadMessage>(
    {
      // Restreint aux fils du domaine : un message ne peut pas atterrir dans la collection d'une autre app
      threadType: { type: String, enum: threadTypesOf(domain), required: true },
      threadId: { type: String, required: true },
      senderId: { type: String },
      senderRole: { type: String, required: true },
      senderName: { type: String },
      senderParticipantId: { type: String },
      // Facultatif si le message porte au moins une pièce jointe
      text: {
        type: String,
        maxlength: 5000,
        default: '',
        validate: {
          validator(this: IThreadMessage, v: string) {
            return !!v?.trim() || (this.attachments?.length ?? 0) > 0
          },
          message: 'Message vide',
        },
      },
      attachments: {
        type: [
          new Schema<MessageAttachment>({
            type: { type: String, enum: ATTACHMENT_TYPES, required: true },
            url: { type: String, required: true },
            name: { type: String },
            mimeType: { type: String },
            size: { type: Number },
            durationSec: { type: Number },
          }, { _id: false }),
        ],
        default: [],
      },
      systemEvent: { type: String },
      // Note interne (support) : jamais renvoyée aux clients
      isInternal: { type: Boolean, default: false },
      // Fils à deux parties : date de lecture par le destinataire
      readAt: { type: Date },
      // Fils à plusieurs participants : qui a lu et quand
      readBy: { type: [{ _id: false, userId: { type: String, required: true }, at: { type: Date, required: true } }], default: [] },
      // Collection d'origine pour les messages migrés
      legacySource: { type: String },
    },
    { timestamps: true, collection: MESSAGE_COLLECTIONS[domain] }
  )

  schema.index({ threadType: 1, threadId: 1, createdAt: 1 })
  schema.index({ threadType: 1, senderRole: 1, createdAt: -1 })
  schema.index({ senderId: 1, createdAt: -1 })

  return mongoose.model<IThreadMessage>(modelName, schema)
}
