import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyAuthServer } from '@/lib/auth-server'
import { Conversation } from '@/lib/models/Conversation'
import User from '@/lib/models/User'

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

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { conversationId } = await context.params

    await connectDB()

    const conversation = await Conversation.findById(conversationId).lean()
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const currentUserId = String(auth.user.id)
    const isParticipant = (conversation.participants || []).some(p => String(p) === currentUserId)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const participantIds = (conversation.participants || []).map(p => String(p))
    const users = participantIds.length
      ? await User.find({ _id: { $in: participantIds } }, { name: 1, role: 1, avatarUrl: 1 }).lean()
      : []

    const usersById = new Map(users.map(u => [String(u._id), u]))

    return NextResponse.json({
      conversation: {
        id: String(conversation._id),
        type: conversation.type,
        title: conversation.title,
        participants: participantIds.map(id => {
          const u = usersById.get(id)
          return {
            id,
            name: u?.name || (id === currentUserId ? auth.user.name || 'Moi' : 'Utilisateur'),
            role: normalizeRole(u?.role),
            avatarUrl: u?.avatarUrl
          }
        }),
        lastMessageAt: conversation.lastMessageAt || null,
        lastMessageText: conversation.lastMessageText || null,
        lastMessageSenderId: conversation.lastMessageSenderId ? String(conversation.lastMessageSenderId) : null,
        updatedAt: conversation.updatedAt,
        createdAt: conversation.createdAt
      }
    })
  } catch (error) {
    console.error('Erreur GET conversation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
