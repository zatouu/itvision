import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceReview from '@/lib/models/ServiceReview'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'

// GET /api/services/reviews?providerId=xxx — notes d'un provider
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const requestId = searchParams.get('requestId')

    const q: any = {}
    if (providerId) q.providerId = providerId
    if (requestId) q.requestId = requestId

    if (!providerId && !requestId) {
      return NextResponse.json({ error: 'providerId ou requestId requis' }, { status: 400 })
    }

    const reviews = await ServiceReview.find(q).sort({ createdAt: -1 }).limit(50).lean()

    // Calculer agrégat si provider
    let stats = null
    if (providerId) {
      const agg = await ServiceReview.aggregate([
        { $match: { providerId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ])
      stats = agg[0] ? { average: Math.round(agg[0].avg * 10) / 10, count: agg[0].count } : { average: 0, count: 0 }
    }

    return NextResponse.json({ reviews, stats })
  } catch (e: any) {
    console.error('[GET /api/services/reviews]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/services/reviews — noter une mission terminée
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    let body: any
    try { body = await request.json() } catch { body = {} }
    const { requestId, rating, comment, tags } = body

    if (!requestId || !rating) {
      return NextResponse.json({ error: 'requestId et rating requis' }, { status: 400 })
    }
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'rating doit être un entier entre 1 et 5' }, { status: 400 })
    }

    // Vérifier que la mission est terminée et appartient au client
    const sr = await ServiceRequest.findById(requestId)
    if (!sr) return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 })
    if (String(sr.clientId) !== String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    if (sr.status !== 'completed') {
      return NextResponse.json({ error: 'La mission doit être terminée pour laisser un avis' }, { status: 400 })
    }
    if (!sr.assignedProviderId) {
      return NextResponse.json({ error: 'Aucun prestataire assigné' }, { status: 400 })
    }

    // Vérifier doublon
    const existing = await ServiceReview.findOne({ requestId, reviewerId: userId })
    if (existing) {
      return NextResponse.json({ error: 'Vous avez déjà noté cette mission', existing }, { status: 409 })
    }

    const review = await ServiceReview.create({
      requestId,
      reviewerId: userId,
      providerId: String(sr.assignedProviderId),
      rating,
      comment: comment ? String(comment).slice(0, 500) : undefined,
      tags: Array.isArray(tags) ? tags.slice(0, 5).map((t: any) => String(t).slice(0, 30)) : [],
    })

    return NextResponse.json({ success: true, review })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (e.code === 11000) return NextResponse.json({ error: 'Avis déjà soumis' }, { status: 409 })
    console.error('[POST /api/services/reviews]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
