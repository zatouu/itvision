import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ChatMessage from '@/models/ChatMessage'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const searchTerm = searchParams.get('q')
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!searchTerm) {
      return NextResponse.json(
        { success: false, error: 'Terme de recherche requis' },
        { status: 400 }
      )
    }

    const query: any = {
      $text: { $search: searchTerm }
    }

    if (conversationId) {
      query.conversationId = conversationId
    }

    const messages = await ChatMessage
      .find(query, {
        score: { $meta: 'textScore' }
      })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ 
      success: true, 
      messages,
      totalCount: messages.length
    })
  } catch (error) {
    console.error('Erreur recherche messages:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
