import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrderChatMessage } from '@/lib/models/GroupOrderChatMessage'
import { requireAdminApi } from '@/lib/api-auth'
import {
  getGroupChatParticipantByToken,
  getGroupChatTokenFromRequest
} from '@/lib/group-orders/chatAuth'

interface RouteContext {
  params: Promise<{ groupId: string }>
}

const getParticipantByToken = getGroupChatParticipantByToken

function parseLimit(value: string | null): number {
  const parsed = value ? Number(value) : NaN
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(Math.floor(parsed), 1), 200)
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { groupId } = await context.params
    await connectDB()

    // Admin can read without token
    const adminAuth = await requireAdminApi(request)
    const isAdmin = adminAuth.ok

    const token = getGroupChatTokenFromRequest(request)
    if (!isAdmin) {
      if (!token) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
      const participant = await getParticipantByToken(groupId, token)
      if (!participant) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get('limit'))

    const messages = await GroupOrderChatMessage.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const ordered = messages.slice().reverse()

    return NextResponse.json({
      messages: ordered.map(m => ({
        id: String(m._id),
        groupId: m.groupId,
        authorType: m.authorType,
        authorParticipantId: m.authorParticipantId || null,
        authorName: m.authorName,
        text: m.text,
        createdAt: m.createdAt
      }))
    })
  } catch (error) {
    console.error('Erreur GET group chat messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { groupId } = await context.params
    const body = await request.json().catch(() => ({}))
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    await connectDB()

    const adminAuth = await requireAdminApi(request)
    const isAdmin = adminAuth.ok

    if (isAdmin && adminAuth.user) {
      const created = await GroupOrderChatMessage.create({
        groupId,
        authorType: 'admin',
        authorUserId: adminAuth.user.id,
        authorName: adminAuth.user.email || 'Admin',
        text
      })

      return NextResponse.json({
        message: {
          id: String(created._id),
          groupId: created.groupId,
          authorType: created.authorType,
          authorParticipantId: null,
          authorName: created.authorName,
          text: created.text,
          createdAt: created.createdAt
        }
      })
    }

    const token = getGroupChatTokenFromRequest(request, (body as any).token)
    if (!token) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const participant = await getParticipantByToken(groupId, token)
    if (!participant) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const created = await GroupOrderChatMessage.create({
      groupId,
      authorType: 'participant',
      authorParticipantId: participant.participantId || undefined,
      authorName: participant.name,
      text
    })

    return NextResponse.json({
      message: {
        id: String(created._id),
        groupId: created.groupId,
        authorType: created.authorType,
        authorParticipantId: created.authorParticipantId || null,
        authorName: created.authorName,
        text: created.text,
        createdAt: created.createdAt
      }
    })
  } catch (error) {
    console.error('Erreur POST group chat message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
