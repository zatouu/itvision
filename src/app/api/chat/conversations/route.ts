import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatConversation from '@/models/ChatConversation'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    const body = await req.json()
    const { conversationId, type, participants, metadata } = body

    // Vérifier si la conversation existe déjà
    let conversation = await ChatConversation.findOne({ conversationId })

    if (!conversation) {
      // Créer nouvelle conversation
      conversation = await ChatConversation.create({
        conversationId,
        type,
        participants,
        metadata,
        isArchived: false,
        unreadCount: new Map()
      })
    } else {
      // Mettre à jour les participants si nécessaire
      const existingUserIds = new Set(conversation.participants.map((p: any) => p.userId))
      const newParticipants = participants.filter((p: any) => !existingUserIds.has(p.userId))
      
      if (newParticipants.length > 0) {
        conversation.participants.push(...newParticipants)
        await conversation.save()
      }
    }

    return NextResponse.json({ 
      success: true, 
      conversation 
    })
  } catch (error) {
    console.error('Erreur gestion conversation:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId requis' },
        { status: 400 }
      )
    }

    const query: any = {
      'participants.userId': userId,
      isArchived: false
    }

    if (type) {
      query.type = type
    }

    const conversations = await ChatConversation
      .find(query)
      .sort({ 'lastMessage.timestamp': -1 })
      .lean()

    return NextResponse.json({ 
      success: true, 
      conversations 
    })
  } catch (error) {
    console.error('Erreur récupération conversations:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
