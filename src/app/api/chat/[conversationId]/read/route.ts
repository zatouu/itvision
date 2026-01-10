import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatMessage from '@/models/ChatMessage'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const { messageIds, userId } = await req.json()

    if (!messageIds || !userId) {
      return NextResponse.json(
        { success: false, error: 'messageIds et userId requis' },
        { status: 400 }
      )
    }

    // Marquer les messages comme lus
    await ChatMessage.updateMany(
      {
        _id: { $in: messageIds },
        conversationId: params.conversationId,
        'readBy.userId': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date()
          }
        }
      }
    )

    // Émettre événement Socket.io
    if (global.io) {
      messageIds.forEach((msgId: string) => {
        (global.io as any).to(`chat-${params.conversationId}`).emit('chat:messageRead', {
          messageId: msgId,
          userId,
          readAt: new Date()
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur marquage lu:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
