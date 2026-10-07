import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { verifyAuthServer } from '@/lib/auth-server'
import { markThreadRead } from '@/lib/messaging/thread-messages'
import { getIO } from '@/lib/socket-emit'

// POST /api/services/chat/read — marque le chat d'une mission comme lu
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.user.id

    let body: any
    try { body = await request.json() } catch { body = {} }
    const requestId = body?.requestId
    if (!requestId) return NextResponse.json({ error: 'requestId requis' }, { status: 400 })

    const sr = await ServiceRequest.findById(requestId).select('clientId assignedProviderId').lean() as any
    if (!sr) return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })

    const isClient = String(sr.clientId) === String(userId)
    const isProvider = String(sr.assignedProviderId) === String(userId)
    if (!isClient && !isProvider) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

    await ServiceRequest.updateOne(
      { _id: requestId },
      { $set: isClient ? { clientChatReadAt: new Date() } : { providerChatReadAt: new Date() } }
    )

    // Statut « lu » par message, poussé à l'autre partie (double coche)
    const newlyRead = await markThreadRead('mission', String(requestId), String(userId))
    if (newlyRead > 0) {
      getIO()?.to(`mission-${requestId}`).emit('chat:read', { requestId: String(requestId), readerId: String(userId), at: new Date() })
    }
    return NextResponse.json({ success: true, newlyRead })
  } catch (e: any) {
    console.error('[POST /api/services/chat/read]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
