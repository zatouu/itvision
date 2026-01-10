import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatMessage from '@/models/ChatMessage'

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const { content } = await req.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Contenu vide' },
        { status: 400 }
      )
    }

    const message = await ChatMessage.findById(params.messageId)

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message introuvable' },
        { status: 404 }
      )
    }

    // Sauvegarder l'ancien contenu dans l'historique
    if (!message.editHistory) {
      message.editHistory = []
    }
    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    })

    // Mettre à jour le message
    message.content = content
    message.isEdited = true
    await message.save()

    // Émettre événement Socket.io
    if (global.io) {
      (global.io as any).to(`chat-${message.conversationId}`).emit('chat:messageEdited', {
        messageId: params.messageId,
        newContent: content,
        isEdited: true
      })
    }

    return NextResponse.json({ 
      success: true, 
      message 
    })
  } catch (error) {
    console.error('Erreur édition message:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
