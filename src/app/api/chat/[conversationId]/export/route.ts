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
    const format = searchParams.get('format') || 'json'

    // Récupérer la conversation
    const conversation = await ChatConversation.findOne({ 
      conversationId: params.conversationId 
    })

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation introuvable' },
        { status: 404 }
      )
    }

    // Récupérer tous les messages
    const messages = await ChatMessage
      .find({ conversationId: params.conversationId })
      .sort({ createdAt: 1 })
      .lean()

    if (format === 'json') {
      // Export JSON
      const exportData = {
        conversation: {
          id: conversation.conversationId,
          type: conversation.type,
          participants: conversation.participants,
          createdAt: conversation.createdAt
        },
        messages: messages.map(msg => ({
          sender: msg.sender.name,
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.type,
          reactions: msg.reactions?.length || 0
        })),
        exportedAt: new Date(),
        totalMessages: messages.length
      }

      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="chat-${params.conversationId}.json"`,
          'Content-Type': 'application/json'
        }
      })
    }

    if (format === 'csv') {
      // Export CSV
      const csvHeader = 'Horodatage,Expéditeur,Rôle,Message,Réactions\n'
      const csvRows = messages.map(msg => {
        const timestamp = new Date(msg.createdAt).toLocaleString('fr-FR')
        const sender = msg.sender.name.replace(/,/g, ' ')
        const role = msg.sender.role || 'USER'
        const content = msg.content.replace(/\n/g, ' ').replace(/,/g, ';')
        const reactions = msg.reactions?.length || 0
        return `"${timestamp}","${sender}","${role}","${content}",${reactions}`
      }).join('\n')

      const csv = csvHeader + csvRows

      return new NextResponse(csv, {
        headers: {
          'Content-Disposition': `attachment; filename="chat-${params.conversationId}.csv"`,
          'Content-Type': 'text/csv; charset=utf-8'
        }
      })
    }

    if (format === 'pdf') {
      // Pour le PDF, retourner un message indiquant que c'est à implémenter
      // Vous pourriez utiliser une bibliothèque comme puppeteer ou pdfkit
      return NextResponse.json(
        { 
          success: false, 
          error: 'Export PDF à implémenter',
          tip: 'Utilisez une bibliothèque comme puppeteer ou pdfkit'
        },
        { status: 501 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Format non supporté' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erreur export conversation:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
