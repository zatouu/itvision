import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatMessage from '@/models/ChatMessage'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const message = await ChatMessage.findById(params.messageId)

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message introuvable' },
        { status: 404 }
      )
    }

    const conversationId = message.conversationId

    // Supprimer le message (soft delete recommandé en production)
    await ChatMessage.findByIdAndDelete(params.messageId)

    // Émettre événement Socket.io
    if (global.io) {
      (global.io as any).to(`chat-${conversationId}`).emit('chat:messageDeleted', params.messageId)
    }

    return NextResponse.json({ 
      success: true 
    })
  } catch (error) {
    console.error('Erreur suppression message:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
