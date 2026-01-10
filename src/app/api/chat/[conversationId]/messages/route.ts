import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatMessage from '@/models/ChatMessage'
import ChatConversation from '@/models/ChatConversation'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // messageId pour pagination

    const query: any = { conversationId: params.conversationId }
    
    if (before) {
      const beforeMessage = await ChatMessage.findById(before)
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt }
      }
    }

    const messages = await ChatMessage
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ 
      success: true, 
      messages: messages.reverse() // Ordre chronologique
    })
  } catch (error) {
    console.error('Erreur récupération messages:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const body = await req.json()
    const {
      sender,
      content,
      type = 'text',
      conversationType,
      attachments,
      metadata
    } = body

    // Validation
    if (!sender?.userId || !content || !conversationType) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes' },
        { status: 400 }
      )
    }

    // Créer le message
    const message = await ChatMessage.create({
      conversationId: params.conversationId,
      conversationType,
      sender,
      content,
      type,
      attachments,
      metadata,
      reactions: [],
      readBy: [{
        userId: sender.userId,
        readAt: new Date()
      }]
    })

    // Mettre à jour la conversation
    await ChatConversation.findOneAndUpdate(
      { conversationId: params.conversationId },
      {
        $set: {
          lastMessage: {
            content: content.substring(0, 100),
            sender: sender.name,
            timestamp: new Date()
          }
        }
      },
      { upsert: true }
    )

    // Émettre via Socket.io (géré par le middleware global)
    if (global.io) {
      global.io.to(`chat-${params.conversationId}`).emit('chat:message', message)
    }

    return NextResponse.json({ 
      success: true, 
      message 
    })
  } catch (error) {
    console.error('Erreur création message:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
