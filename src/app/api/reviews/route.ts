import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Review from '@/lib/models/Review'
import { verifyAuthToken } from '@/lib/jwt'

// GET /api/reviews?productId=xxx&page=1&limit=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) {
      return NextResponse.json({ error: 'productId requis' }, { status: 400 })
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const skip = (page - 1) * limit

    await connectMongoose()

    const filter = { productId, status: 'approved' }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ])

    // Stats agregees
    const allRatings = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
          r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          withPhotos: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$photos', []] } }, 0] }, 1, 0] } },
        },
      },
    ])

    const stats = allRatings[0] || { avgRating: 0, count: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, withPhotos: 0 }

    return NextResponse.json({
      success: true,
      reviews: (reviews as any[]).map(r => ({
        id: String(r._id),
        userName: r.userName,
        rating: r.rating,
        title: r.title || null,
        comment: r.comment,
        photos: r.photos || [],
        verified: r.verified,
        helpful: r.helpful || 0,
        createdAt: r.createdAt,
      })),
      stats: {
        avgRating: Math.round((stats.avgRating || 0) * 10) / 10,
        total: stats.count,
        distribution: { 1: stats.r1, 2: stats.r2, 3: stats.r3, 4: stats.r4, 5: stats.r5 },
        withPhotos: stats.withPhotos,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Erreur GET reviews:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/reviews — Creer un avis (authentifie ou non)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, rating, comment, title, photos, userName, orderId } = body

    if (!productId || !rating || !comment) {
      return NextResponse.json(
        { error: 'productId, rating et comment sont requis' },
        { status: 400 }
      )
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating doit etre entre 1 et 5' }, { status: 400 })
    }

    if (typeof comment !== 'string' || comment.trim().length < 10) {
      return NextResponse.json({ error: 'Le commentaire doit faire au moins 10 caracteres' }, { status: 400 })
    }

    // Verifier les photos (max 5, URLs valides)
    let cleanPhotos: string[] = []
    if (Array.isArray(photos)) {
      cleanPhotos = photos
        .filter((p: any) => typeof p === 'string' && p.startsWith('http'))
        .slice(0, 5)
    }

    // Tenter d'identifier l'utilisateur connecte
    let userId: string | undefined
    let resolvedUserName = userName || 'Client'
    let verified = false

    try {
      const token = req.cookies.get('auth-token')?.value
      if (token) {
        const decoded = await verifyAuthToken(token)
        userId = decoded.userId
        resolvedUserName = decoded.username || decoded.email || userName || 'Client'
        verified = true
      }
    } catch {}

    // Empecher les doublons (meme user, meme produit)
    if (userId) {
      await connectMongoose()
      const existing = await Review.findOne({ productId, userId })
      if (existing) {
        return NextResponse.json(
          { error: 'Vous avez deja laisse un avis pour ce produit' },
          { status: 409 }
        )
      }
    }

    await connectMongoose()

    const review = await Review.create({
      productId,
      userId,
      userName: resolvedUserName,
      rating: Math.round(rating),
      title: title?.trim() || undefined,
      comment: comment.trim(),
      photos: cleanPhotos,
      verified,
      orderId: orderId || undefined,
      status: 'approved',
    })

    return NextResponse.json({
      success: true,
      review: {
        id: String(review._id),
        userName: review.userName,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        photos: review.photos,
        verified: review.verified,
        createdAt: review.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST review:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
