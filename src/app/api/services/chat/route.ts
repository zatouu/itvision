import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { listThreadMessages, postMessage, toMissionMessageDto, EmptyMessageError } from '@/lib/messaging/thread-messages'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'
import { sendPushToUser } from '@/lib/push'
import { contactMaskingEnabled, maskContactInfo } from '@/lib/messaging/contact-masking'
import { getMissionQuickReplies } from '@/lib/messaging/quick-replies'

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
    const isClientViewer = String(sr.clientId) === String(userId)
    const isParticipant = isClientViewer || String(sr.assignedProviderId) === String(userId)
    if (!isParticipant) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

    const messages = await listThreadMessages('mission', requestId, { limit: 200 })
    return NextResponse.json({
      messages: messages.map(toMissionMessageDto),
      quickReplies: getMissionQuickReplies(String(sr.status), isClientViewer ? 'client' : 'provider'),
    })
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
    const { requestId, text, attachments } = body

    const hasText = typeof text === 'string' && text.trim().length > 0
    if (!requestId || (!hasText && !Array.isArray(attachments))) {
      return NextResponse.json({ error: 'requestId et text requis' }, { status: 400 })
    }

    const sr = await ServiceRequest.findById(requestId).lean() as any
    if (!sr) return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })

    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    if (!isClient && !isProvider) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

    // Mission doit être active (statuts legacy + nouveaux)
    if (!['assigned', 'accepted', 'provider_arriving', 'on_the_way', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute'].includes(sr.status)) {
      return NextResponse.json({ error: 'Chat disponible uniquement pendant la mission active' }, { status: 400 })
    }

    const senderRole = isClient ? 'client' : 'provider'
    const masking = contactMaskingEnabled() && hasText ? maskContactInfo(text) : null
    const msg = await postMessage({
      threadType: 'mission',
      threadId: String(requestId),
      senderId: String(userId),
      senderRole,
      text: masking ? masking.text : text,
      attachments,
    })

    // Mettre à jour la fraîcheur de la mission
    const lifecycle = await import('@/lib/mission-lifecycle')
    await lifecycle.touch(requestId, 'chat', userId)

    // Push notification au destinataire (fire & forget)
    const recipientId = isClient ? String(sr.assignedProviderId) : String(sr.clientId)
    const recipientAppType = isClient ? 'provider' : 'consumer'

    // Émettre via WebSocket
    const io = (global as any).io
    if (io) {
      const payload = toMissionMessageDto(msg)
      io.to(`mission-${requestId}`).emit('chat:message', payload)
      // Émettre aussi dans la room personnelle du destinataire pour les notifications in-app
      // même lorsque l'utilisateur n'est pas sur l'écran de chat
      io.to(`${isClient ? 'provider' : 'user'}-${recipientId}`).emit('chat:message', payload)
    }
    if (recipientId) {
      const preview = msg.text || (msg.attachments?.[0]?.type === 'audio' ? 'Message vocal' : 'Pièce jointe')
      await sendPushToUser(recipientId, {
        title: `💬 ${isClient ? 'Client' : 'Prestataire'}: ${preview.slice(0, 50)}`,
        body: preview.slice(0, 100),
        data: { type: 'chat:message', requestId, senderRole },
        appType: recipientAppType as 'consumer' | 'provider',
      })
    }

    return NextResponse.json({ success: true, message: toMissionMessageDto(msg), contactMasked: !!masking?.masked })
  } catch (e: any) {
    if (e instanceof EmptyMessageError) return NextResponse.json({ error: 'requestId et text requis' }, { status: 400 })
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/chat]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
