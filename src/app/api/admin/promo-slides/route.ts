import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PromoSlide from '@/lib/models/PromoSlide'
import { requireAuth } from '@/lib/jwt'

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

    const body = await request.json()
    const slide = await PromoSlide.create({
      title: body.title || 'Nouvelle slide',
      subtitle: body.subtitle,
      ctaText: body.ctaText || 'En savoir plus',
      ctaLink: body.ctaLink || '/produits',
      bgColor: body.bgColor,
      accentColor: body.accentColor,
      textColor: body.textColor,
      images: body.images || [],
      isActive: body.isActive ?? true,
      order: typeof body.order === 'number' ? body.order : 0,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    })

    return NextResponse.json({ success: true, slide })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur' },
      { status: err.message === 'Accès non autorisé' ? 403 : 500 }
    )
  }
}
