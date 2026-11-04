import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PromoSlide from '@/lib/models/PromoSlide'
import { requireAuth } from '@/lib/jwt'
import { parseSlideInput } from '@/lib/market/promo-slides'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']

async function requireAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (!ADMIN_ROLES.includes(role)) {
    throw new Error('Accès non autorisé')
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    const slides = await PromoSlide.find()
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await PromoSlide.countDocuments()

    return NextResponse.json({ success: true, slides, total })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur' },
      { status: err.message === 'Accès non autorisé' ? 403 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const body = await request.json().catch(() => ({}))
    const { data, error } = parseSlideInput(body, false)
    if (error) return NextResponse.json({ success: false, error }, { status: 400 })

    // Sans ordre précisé, la nouvelle slide passe en dernier
    if (data.order === undefined) {
      const last = await PromoSlide.findOne().sort({ order: -1 }).select('order').lean<{ order?: number }>()
      data.order = (last?.order ?? -1) + 1
    }
    const slide = await PromoSlide.create({
      ...data,
      ctaText: data.ctaText || 'Découvrir',
      ctaLink: data.ctaLink || '/produits',
      images: data.images || [],
      isActive: data.isActive ?? true,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
    })

    return NextResponse.json({ success: true, slide })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur' },
      { status: err.message === 'Accès non autorisé' ? 403 : 500 }
    )
  }
}
