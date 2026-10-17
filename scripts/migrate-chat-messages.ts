/**
 * Migration : répartit les 5 anciennes collections de messages dans une collection par domaine
 * (market_messages, xeuy_messages, shared_messages — cf. src/lib/messaging/thread-message-schema.ts).
 *
 * - Conserve les _id d'origine (références Conversation.lastMessageId, ids SSE/socket inchangés).
 * - Idempotent : relançable sans doublon (upsert sur _id). À relancer après le déploiement
 *   pour rattraper les messages écrits entre-temps dans les anciennes collections.
 * - Ne supprime rien : les anciennes collections restent disponibles pour un retour arrière.
 *
 * Usage :
 *   npx tsx scripts/migrate-chat-messages.ts --dry-run
 *   npx tsx scripts/migrate-chat-messages.ts
 */

import mongoose from 'mongoose'
import { connectDB } from '../src/lib/db'
import MarketMessage from '../src/lib/models/MarketMessage'
import XeuyMessage from '../src/lib/models/XeuyMessage'
import SharedMessage from '../src/lib/models/SharedMessage'
import { THREAD_DOMAIN, MESSAGE_COLLECTIONS, type ThreadType } from '../src/lib/messaging/thread-message-schema'

const isDryRun = process.argv.includes('--dry-run')
const BATCH_SIZE = 500
const MAX_TEXT = 5000

type LegacyDoc = Record<string, any>
type Mapped = Record<string, unknown> | null

const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v))
const text = (v: unknown) => String(v ?? '').slice(0, MAX_TEXT)

const SOURCES: Array<{ collection: string; map: (d: LegacyDoc) => Mapped }> = [
  {
    collection: 'messages',
    map: (d) => d.conversationId && {
      threadType: 'conversation',
      threadId: String(d.conversationId),
      senderId: str(d.senderId),
      senderRole: d.senderRole || 'user',
      text: text(d.text),
    },
  },
  {
    collection: 'chatmessages',
    map: (d) => d.requestId && {
      threadType: 'mission',
      threadId: String(d.requestId),
      senderId: str(d.senderId),
      senderRole: d.senderRole,
      text: text(d.text),
    },
  },
  {
    collection: 'orderchatmessages',
    map: (d) => (d.orderReference || d.orderId) && {
      threadType: 'order',
      threadId: String(d.orderReference || d.orderId),
      senderId: str(d.senderId),
      senderRole: d.senderRole,
      senderName: d.senderName,
      text: text(d.text),
      isInternal: !!d.isInternal,
      readAt: d.readAt,
    },
  },
  {
    collection: 'grouporderchatmessages',
    map: (d) => d.groupId && {
      threadType: 'group_order',
      threadId: String(d.groupId),
      senderId: str(d.authorUserId),
      senderRole: d.authorType,
      senderName: d.authorName,
      senderParticipantId: d.authorParticipantId,
      text: text(d.text),
    },
  },
  {
    // Deux schémas ont cohabité dans cette collection : litiges de mission (requestId)
    // et module src/dispute (disputeId)
    collection: 'disputemessages',
    map: (d) => {
      if (d.requestId) {
        return {
          threadType: 'mission_dispute',
          threadId: String(d.requestId),
          senderId: str(d.senderId),
          senderRole: d.senderRole,
          text: text(d.text),
        }
      }
      if (d.disputeId) {
        return {
          threadType: 'dispute_case',
          threadId: String(d.disputeId),
          senderId: str(d.authorId),
          senderRole: d.authorType,
          text: text(d.message),
          readAt: d.readAt,
        }
      }
      return null
    },
  },
]

async function migrateSource(db: mongoose.mongo.Db, source: (typeof SOURCES)[number]) {
  const exists = await db.listCollections({ name: source.collection }).hasNext()
  if (!exists) {
    console.log(`[migrate-chat] ${source.collection} : collection absente, ignorée`)
    return { read: 0, inserted: 0, skipped: 0 }
  }

  const cursor = db.collection(source.collection).find({})
  let read = 0
  let inserted = 0
  let skipped = 0
  const batches = new Map<string, any[]>()

  const flush = async (targetCollection: string) => {
    const batch = batches.get(targetCollection) || []
    if (batch.length === 0) return
    if (!isDryRun) {
      const res = await db.collection(targetCollection).bulkWrite(batch, { ordered: false })
      inserted += res.upsertedCount
    }
    batches.set(targetCollection, [])
  }

  for await (const doc of cursor) {
    read++
    const mapped = source.map(doc)
    if (!mapped || !mapped.text || !mapped.senderRole) {
      skipped++
      continue
    }
    const targetCollection = MESSAGE_COLLECTIONS[THREAD_DOMAIN[mapped.threadType as ThreadType]]
    const createdAt = doc.createdAt || (doc._id as mongoose.Types.ObjectId).getTimestamp()
    const batch = batches.get(targetCollection) || []
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $setOnInsert: {
            ...Object.fromEntries(Object.entries(mapped).filter(([, v]) => v !== undefined)),
            isInternal: mapped.isInternal ?? false,
            legacySource: source.collection,
            createdAt,
            updatedAt: doc.updatedAt || createdAt,
          },
        },
        upsert: true,
      },
    })
    batches.set(targetCollection, batch)
    if (batch.length >= BATCH_SIZE) await flush(targetCollection)
  }
  for (const targetCollection of batches.keys()) await flush(targetCollection)

  console.log(
    `[migrate-chat] ${source.collection} : ${read} lus, ` +
    (isDryRun ? `${read - skipped} à migrer` : `${inserted} insérés (${read - skipped - inserted} déjà présents)`) +
    `, ${skipped} ignorés (incomplets)`
  )
  return { read, inserted, skipped }
}

async function main() {
  await connectDB()
  const db = mongoose.connection.db
  if (!db) throw new Error('Connexion MongoDB indisponible')

  if (!isDryRun) {
    await Promise.all([MarketMessage.createIndexes(), XeuyMessage.createIndexes(), SharedMessage.createIndexes()])
  }

  let total = 0
  for (const source of SOURCES) {
    const { inserted } = await migrateSource(db, source)
    total += inserted
  }

  console.log(isDryRun
    ? '[migrate-chat] Mode dry-run : aucune écriture effectuée.'
    : `[migrate-chat] Terminé : ${total} messages insérés (${Object.values(MESSAGE_COLLECTIONS).join(', ')}).`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[migrate-chat] Erreur :', err)
  process.exit(1)
})
