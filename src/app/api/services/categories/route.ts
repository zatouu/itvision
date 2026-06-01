import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceCategory from '@/lib/models/ServiceCategory'

/**
 * GET /api/services/categories
 * Public endpoint — returns active categories sorted by order.
 * Cached 5 min client-side via Cache-Control.
 */
export async function GET(_request: NextRequest) {
  try {
    await connectMongoose()
    const categories = await ServiceCategory.find({ isActive: true })
      .sort({ order: 1 })
      .lean()

    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (e) {
    console.error('[GET /api/services/categories]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

/**
 * POST /api/services/categories — Admin only: create/update category
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { requireAuth } = await import('@/lib/jwt')
    const { role } = await requireAuth(request)
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    }

    const body = await request.json()
    const { slug, label_fr, label_wo, label_en, abbr, color, icon, order, isActive, subCategories } = body

    if (!slug || !label_fr || !abbr || !color) {
      return NextResponse.json({ error: 'slug, label_fr, abbr et color requis' }, { status: 400 })
    }

    const cat = await ServiceCategory.findOneAndUpdate(
      { slug },
      { slug, label_fr, label_wo, label_en, abbr, color, icon, order: order ?? 0, isActive: isActive ?? true, subCategories: subCategories || [] },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({ success: true, category: cat })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/categories]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
