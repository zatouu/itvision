import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyAuthServer } from '@/lib/auth-server'
import { Conversation } from '@/lib/models/Conversation'
import User from '@/lib/models/User'

function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(v => String(v).trim()).filter(Boolean)))
}

function normalizeRole(role: string | undefined): string {
  return String(role || '').toUpperCase()
}

async function requireAuth(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user?.id) {
    return { ok: false as const, status: 401 as const, error: 'Non authentifié' }
  }
  return { ok: true as const, user: auth.user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectDB()

    const userId = auth.user.id

    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()

    const otherParticipantIds = Array.from(
      new Set(
        conversations
          .flatMap(c => (c.participants || []).map(p => String(p)))
          .filter(id => id !== String(userId))
      )
    )

    const users = otherParticipantIds.length
      ? await User.find({ _id: { $in: otherParticipantIds } }, { name: 1, role: 1, avatarUrl: 1 }).lean()
      : []

    const usersById = new Map(users.map(u => [String(u._id), u]))

    return NextResponse.json({
      conversations: conversations.map(c => {
        const participantSummaries = (c.participants || []).map(p => {
          const id = String(p)
          const u = usersById.get(id)
          return {
            id,
            name: u?.name || (id === String(userId) ? auth.user.name || 'Moi' : 'Utilisateur'),
            role: normalizeRole(u?.role),
            avatarUrl: u?.avatarUrl
          }
        })

        return {
          id: String(c._id),
          type: c.type,
          title: c.title,
          participants: participantSummaries,
          lastMessageAt: c.lastMessageAt || null,
          lastMessageText: c.lastMessageText || null,
          lastMessageSenderId: c.lastMessageSenderId ? String(c.lastMessageSenderId) : null,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt
        }
      })
    })
  } catch (error) {
    console.error('Erreur GET conversations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))

    const type = (body.type === 'group' ? 'group' : 'direct') as 'direct' | 'group'
    const rawParticipantIds = Array.isArray(body.participantIds) ? body.participantIds : []
    const participantIds = uniqStrings(rawParticipantIds)

    await connectDB()

    const currentUserId = String(auth.user.id)
    if (!participantIds.includes(currentUserId)) {
      participantIds.push(currentUserId)
    }

    if (type === 'direct') {
      if (participantIds.length !== 2) {
        return NextResponse.json({ error: 'Une conversation directe doit avoir exactement 2 participants.' }, { status: 400 })
      }

      // Basic safety: clients cannot start direct conversations with arbitrary users.
      const requesterRole = normalizeRole(auth.user.role)
      if (requesterRole === 'CLIENT') {
        const otherId = participantIds.find(id => id !== currentUserId) as string
        const other = await User.findById(otherId, { role: 1 }).lean()
        const otherRole = normalizeRole(other?.role)
        const allowed = ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN']
        if (!allowed.includes(otherRole)) {
          return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        }
      }

      const participantKey = participantIds.slice().sort().join(':')

      const existing = await Conversation.findOne({ type: 'direct', participantKey }).lean()
      if (existing) {
        return NextResponse.json({
          conversation: {
            id: String(existing._id),
            type: existing.type,
            title: existing.title,
            participants: (existing.participants || []).map(p => String(p)),
            updatedAt: existing.updatedAt,
            createdAt: existing.createdAt
          },
          created: false
        })
      }

      const created = await Conversation.create({
        type: 'direct',
        participants: participantIds,
        participantKey,
        createdBy: currentUserId
      })

      return NextResponse.json({
        conversation: {
          id: String(created._id),
          type: created.type,
          title: created.title,
          participants: (created.participants || []).map(p => String(p)),
          updatedAt: created.updatedAt,
          createdAt: created.createdAt
        },
        created: true
      })
    }

    // group
    if (participantIds.length < 2) {
      return NextResponse.json({ error: 'Une conversation de groupe doit avoir au moins 2 participants.' }, { status: 400 })
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''

    const created = await Conversation.create({
      type: 'group',
      title: title || undefined,
      participants: participantIds,
      createdBy: currentUserId
    })

    return NextResponse.json({
      conversation: {
        id: String(created._id),
        type: created.type,
        title: created.title,
        participants: (created.participants || []).map(p => String(p)),
        updatedAt: created.updatedAt,
        createdAt: created.createdAt
      },
      created: true
    })
  } catch (error) {
    console.error('Erreur POST conversations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
