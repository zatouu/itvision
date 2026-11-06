import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductQuestion from '@/lib/models/ProductQuestion'
import { verifyAuthToken } from '@/lib/jwt'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const askSchema = z.object({
  productId: z.string().min(1),
  question: z.string().min(5).max(500),
  askedByName: z.string().min(2).max(100),
  askedByEmail: z.string().email().optional().or(z.literal('')),
})

const isProduction = process.env.NODE_ENV === 'production'

export async function GET(req: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    if (!productId) {
      return NextResponse.json({ error: 'productId requis' }, { status: 400 })
    }

    const filter = { productId, status: 'published' }
    const skip = (page - 1) * limit

    const [questions, total] = await Promise.all([
      ProductQuestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProductQuestion.countDocuments(filter),
    ])

    return NextResponse.json({
      success: true,
      questions: (questions as any[]).map(q => ({
        id: String(q._id),
        question: q.question,
        askedByName: q.askedByName,
        answer: q.answer,
        answeredBy: q.answeredBy,
        answeredAt: q.answeredAt,
        helpful: q.helpful,
        createdAt: q.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('GET /api/reviews/questions error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const limit = await rateLimitRequest(req, { windowMs: 60_000, max: 5, keyPrefix: 'product:question' })
    if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

    await connectMongoose()
    const body = await req.json()
    const parsed = askSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }

    const { productId, question, askedByName, askedByEmail } = parsed.data

    let askedByUserId: string | undefined
    try {
      const token = req.cookies.get('auth-token')?.value
      if (token) {
        const decoded = await verifyAuthToken(token)
        askedByUserId = decoded.userId
      }
    } catch {}

    const q = await ProductQuestion.create({
      productId,
      question: question.trim(),
      askedByName: askedByName.trim(),
      askedByEmail: askedByEmail?.trim() || undefined,
      askedByUserId,
      status: isProduction ? 'pending' : 'published',
      isPublished: !isProduction,
    })

    return NextResponse.json({
      success: true,
      question: {
        id: String(q._id),
        question: q.question,
        askedByName: q.askedByName,
        answer: q.answer,
        answeredAt: q.answeredAt,
        helpful: q.helpful,
        createdAt: q.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/reviews/questions error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
