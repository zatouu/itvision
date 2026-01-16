import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'

export function hashGroupChatToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getGroupChatTokenTtlDays(): number {
  const raw = process.env.GROUP_ORDER_CHAT_TOKEN_TTL_DAYS
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 90
}

export function getGroupChatMinTokenCreatedAt(): Date {
  const ttlDays = getGroupChatTokenTtlDays()
  return new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000)
}

export function getGroupChatTokenFromRequest(req: NextRequest, bodyToken?: unknown): string | null {
  if (typeof bodyToken === 'string' && bodyToken.trim()) return bodyToken.trim()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('token') || searchParams.get('t')
  return q && q.trim() ? q.trim() : null
}

export async function getGroupChatParticipantByToken(groupId: string, token: string) {
  const tokenHash = hashGroupChatToken(token)
  const minCreatedAt = getGroupChatMinTokenCreatedAt()

  const group = await GroupOrder.findOne(
    {
      groupId,
      participants: {
        $elemMatch: {
          chatAccessTokenHash: tokenHash,
          chatAccessTokenCreatedAt: { $gte: minCreatedAt }
        }
      }
    },
    { participants: 1 }
  ).lean()

  if (!group || !Array.isArray((group as any).participants)) return null

  const participant = (group as any).participants.find((p: any) =>
    p?.chatAccessTokenHash === tokenHash &&
    p?.chatAccessTokenCreatedAt &&
    new Date(p.chatAccessTokenCreatedAt).getTime() >= minCreatedAt.getTime()
  )

  if (!participant) return null

  return {
    participantId: participant?._id ? String(participant._id) : null,
    name: String(participant?.name || 'Participant')
  }
}
