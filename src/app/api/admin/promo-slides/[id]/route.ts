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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { data: update, error } = parseSlideInput(body, true)
    if (error) return NextResponse.json({ success: false, error }, { status: 400 })

    const slide = await PromoSlide.findByIdAndUpdate(id, update, { new: true, runValidators: true })

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
