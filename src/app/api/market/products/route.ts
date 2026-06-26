import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'

// GET /api/market/products?search=&category=&condition=&limit=20&skip=0
// Catalogue public marketplace (market.itvisionplus.sn)
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('search') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const condition = (searchParams.get('condition') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const query: any = {
      isPublished: { $ne: false },
      $or: [
        { channels: { $in: ['marketplace'] } },
        { channels: { $exists: false } }, // Fallback : produits sans channels = marketplace historique
      ]
    }

    if (q) query.name = new RegExp(q, 'i')
    if (category) query.category = category
    if (condition && (condition === 'new' || condition === 'used' || condition === 'refurbished')) {
      query.condition = condition
    }

    const [items, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ])

    return NextResponse.json({ success: true, items, total, skip, limit, domain: 'marketplace' })
  } catch (e) {
    console.error('[GET /api/market/products]', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch marketplace products' }, { status: 500 })
  }
}
