import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import SentEmail from '@/lib/models/SentEmail'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const filter: Record<string, unknown> = {}
    if (status) {
      filter.status = status
    }
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
        { bcc: { $regex: search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit

    const [emails, total] = await Promise.all([
      SentEmail.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SentEmail.countDocuments(filter)
    ])

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[EMAILS API] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des emails' },
      { status: 500 }
    )
  }
}
