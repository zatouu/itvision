import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ChatMessage from '@/lib/models/ChatMessage'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'

// GET /api/services/chat?requestId=xxx — historique des messages
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    if (!requestId) return NextResponse.json({ error: 'requestId requis' }, { status: 400 })

    // Vérifier que l'utilisateur est participant de cette mission
    const sr = await ServiceRequest.findById(requestId).lean() as any
    if (!sr) return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })
    const isParticipant = String(sr.clientId) === String(userId) || String(sr.assignedProviderId) === String(userId)
    if (!isParticipant) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

    const messages = await ChatMessage.find({ requestId }).sort({ createdAt: 1 }).limit(200).lean()
    return NextResponse.json({ messages })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/chat]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/services/chat — envoyer un message
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await requireAuth(request)

    let body: any
    try { body = await request.json() } catch { body = {} }
    const { requestId, text } = body

    if (!requestId || !text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'requestId et text requis' }, { status: 400 })
    }

    const sr = await ServiceRequest.findById(requestId).lean() as any
    if (!sr) return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })

    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    if (!isClient && !isProvider) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

    // Mission doit être active
    if (!['assigned', 'in_progress', 'provider_arriving'].includes(sr.status)) {
      return NextResponse.json({ error: 'Chat disponible uniquement pendant la mission active' }, { status: 400 })
    }

    const senderRole = isClient ? 'client' : 'provider'
    const msg = await ChatMessage.create({
      requestId,
      senderId: userId,
      senderRole,
      text: text.trim().slice(0, 1000),
    })

    // Émettre via WebSocket
    const io = (global as any).io
    if (io) {
      io.to(`mission-${requestId}`).emit('chat:message', {
        _id: msg._id,
        requestId,
        senderId: userId,
        senderRole,
        text: msg.text,
        createdAt: msg.createdAt,
      })
    }

    return NextResponse.json({ success: true, message: msg })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/chat]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
