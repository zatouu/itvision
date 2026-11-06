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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { id } = await params
    const body = await request.json()

    const update: any = {}
    if (body.title !== undefined) update.title = body.title
    if (body.subtitle !== undefined) update.subtitle = body.subtitle
    if (body.ctaText !== undefined) update.ctaText = body.ctaText
    if (body.ctaLink !== undefined) update.ctaLink = body.ctaLink
    if (body.bgColor !== undefined) update.bgColor = body.bgColor
    if (body.accentColor !== undefined) update.accentColor = body.accentColor
    if (body.textColor !== undefined) update.textColor = body.textColor
    if (body.images !== undefined) update.images = body.images
    if (body.isActive !== undefined) update.isActive = body.isActive
    if (typeof body.order === 'number') update.order = body.order
    if (body.startDate !== undefined) update.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) update.endDate = body.endDate ? new Date(body.endDate) : null

    const slide = await PromoSlide.findByIdAndUpdate(id, update, { new: true })

    if (!slide) {
      return NextResponse.json({ success: false, error: 'Slide introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, slide })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur' },
      { status: err.message === 'Accès non autorisé' ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { id } = await params
    const slide = await PromoSlide.findByIdAndDelete(id)

    if (!slide) {
      return NextResponse.json({ success: false, error: 'Slide introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur' },
      { status: err.message === 'Accès non autorisé' ? 403 : 500 }
    )
  }
}
