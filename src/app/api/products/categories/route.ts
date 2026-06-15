import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import Product from '@/lib/models/Product.validated'
import { requireAuth } from '@/lib/jwt'

async function requireManagerRole(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    // Enrich categories with product counts
    const cats = await ProductCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()

    // Count products per category (top-level slug only)
    const counts = await Product.aggregate([
      { $match: { category: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
    const countMap = new Map(counts.map((c: any) => [String(c._id), Number(c.count) || 0]))

    const items = cats.map(c => ({
      category: c.slug,
      name: c.labelFr || c.name,
      label: c.labelFr || c.name,
      icon: c.icon,
      color: c.color,
      subCategories: (c.subCategories || []).map((s: any) => ({
        slug: s.slug,
        name: s.labelFr || s.name,
        icon: s.icon
      })),
      count: countMap.get(c.slug) || 0
    }))

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET /api/products/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
