import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Feedback from '@/lib/models/Feedback'
import User from '@/lib/models/User'
import jwt from 'jsonwebtoken'

function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
  return decoded
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const user = requireAuth(request)
    const body = await request.json()
    const { projectId, technicianId, rating, comment } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Note invalide' }, { status: 400 })
    }

    // Optionnel: restreindre aux clients
    if (String(user.role).toUpperCase() !== 'CLIENT') {
      return NextResponse.json({ error: 'Réservé aux clients' }, { status: 403 })
    }

    const created = await Feedback.create({
      projectId,
      technicianId,
      clientId: user.userId,
      rating,
      comment
    })

    return NextResponse.json({ success: true, feedback: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// Récupérer agrégats: moyenne par technicien, et liste si besoin
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    requireAuth(request)

    const { searchParams } = new URL(request.url)
    const technicianId = searchParams.get('technicianId') || undefined
    const projectId = searchParams.get('projectId') || undefined
    const mode = searchParams.get('mode') || 'stats' // stats | list

    const query: any = {}
    if (technicianId) query.technicianId = technicianId
    if (projectId) query.projectId = projectId

    if (mode === 'list') {
      const items = await Feedback.find(query).sort({ createdAt: -1 }).limit(100).lean()
      return NextResponse.json({ success: true, items })
    }

    // stats
    const [agg] = await Feedback.aggregate([
      { $match: query },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ])

    return NextResponse.json({ success: true, avgRating: agg?.avgRating || 0, count: agg?.count || 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
