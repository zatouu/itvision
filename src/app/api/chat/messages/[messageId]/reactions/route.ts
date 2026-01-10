import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatMessage from '@/models/ChatMessage'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB()
    
    const params = await context.params

    const { emoji, userId, userName } = await req.json()

    if (!emoji || !userId || !userName) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes' },
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

    // Vérifier si l'utilisateur a déjà réagi
    const existingReaction = message.reactions?.find((r: any) => r.userId === userId)

    if (existingReaction) {
      // Retirer la réaction
      message.reactions = message.reactions?.filter((r: any) => r.userId !== userId) || []
    } else {
      // Ajouter la réaction
      if (!message.reactions) {
        message.reactions = []
      }
      message.reactions.push({ emoji, userId, userName })
    }

    await message.save()

    // Émettre événement Socket.io
    if (global.io) {
      global.io.to(`chat-${message.conversationId}`).emit('chat:reaction', {
        messageId: params.messageId,
        emoji,
        userId,
        userName
      })
    }

    return NextResponse.json({ 
      success: true, 
      reactions: message.reactions 
    })
  } catch (error) {
    console.error('Erreur ajout réaction:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
