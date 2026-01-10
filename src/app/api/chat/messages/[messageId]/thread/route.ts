import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatMessage from '@/models/ChatMessage'

// Récupérer les réponses d'un thread
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const replies = await ChatMessage
      .find({ threadId: params.messageId })
      .sort({ createdAt: 1 })
      .lean()

    return NextResponse.json({ 
      success: true, 
      replies 
    })
  } catch (error) {
    console.error('Erreur récupération thread:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Ajouter une réponse à un thread
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const body = await req.json()
    const {
      sender,
      content,
      conversationType,
      conversationId,
      attachments,
      metadata
    } = body

    // Validation
    if (!sender?.userId || !content || !conversationType || !conversationId) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes' },
        { status: 400 }
      )
    }

    // Vérifier que le message parent existe
    const parentMessage = await ChatMessage.findById(params.messageId)
    if (!parentMessage) {
      return NextResponse.json(
        { success: false, error: 'Message parent introuvable' },
        { status: 404 }
      )
    }

    // Créer la réponse
    const reply = await ChatMessage.create({
      conversationId,
      conversationType,
      sender,
      content,
      type: 'text',
      threadId: params.messageId,
      attachments,
      metadata,
      reactions: [],
      readBy: [{
        userId: sender.userId,
        readAt: new Date()
      }]
    })

    // Incrémenter le compteur de réponses du parent
    await ChatMessage.findByIdAndUpdate(params.messageId, {
      $inc: { repliesCount: 1 }
    })

    // Émettre événement Socket.io
    if (global.io) {
      (global.io as any).to(`chat-${conversationId}`).emit('chat:threadReply', reply)
    }

    return NextResponse.json({ 
      success: true, 
      reply 
    })
  } catch (error) {
    console.error('Erreur ajout réponse thread:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
