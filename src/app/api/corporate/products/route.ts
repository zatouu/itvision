import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { corporateCatalogFilter } from '@/lib/market/corporate-catalog'

// GET /api/corporate/products?q=&category=&limit=80
// Catalogue public corporate (itvisionplus.sn/produits)
// ⚠️ Produits IT Vision uniquement — jamais un produit de vendeur tiers
// (cf. src/lib/market/corporate-catalog.ts).
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '80'), 1), 100)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const query = corporateCatalogFilter({ search: q || undefined, category: category || undefined })

    const [items, total] = await Promise.all([
      Product.find(query)
        .select(
          'name category description tagline image price b2bPrice currency features stockStatus stockQuantity leadTimeDays isFeatured corporateVisible channels'
        )
        .sort({ isFeatured: -1, corporateVisible: -1, category: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ])

    return NextResponse.json({ success: true, items, total, skip, limit, domain: 'corporate' })
  } catch (e) {
    console.error('[GET /api/corporate/products]', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch corporate products' }, { status: 500 })
  }
}
