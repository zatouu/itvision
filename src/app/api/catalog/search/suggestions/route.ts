import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { computeProductPricing } from '@/lib/logistics'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().slice(0, 80)
    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 20)

    const projection = {
      _id: 1,
      name: 1,
      image: 1,
      category: 1,
      baseCost: 1,
      price: 1,
      currency: 1,
      slug: 1,
      isFeatured: 1,
      viewCount: 1,
      soldCount: 1,
      stockStatus: 1,
    }

    let suggestions: any[] = []

    if (q.length >= 2) {
      const regex = { $regex: escapeRegex(q), $options: 'i' }
      const suggestionQuery = {
        isPublished: { $ne: false },
        $or: [
          { name: regex },
          { tagline: regex },
          { tags: { $in: [q] } },
          { 'sourcing.title': regex },
        ],
      }

      const docs = await Product.find(suggestionQuery)
        .select(projection)
        .sort({ isFeatured: -1, soldCount: -1, viewCount: -1, createdAt: -1 })
        .limit(limit)
        .lean()

      suggestions = docs
    }

    // Trending: produits populaires / vedettes pour affichage quand le champ est vide
    const trendingLimit = Math.min(parseInt(searchParams.get('trendingLimit') || '6', 10), 12)
    const trendingDocs = await Product.find({ isPublished: { $ne: false } })
      .select(projection)
      .sort({ isFeatured: -1, soldCount: -1, viewCount: -1, createdAt: -1 })
      .limit(trendingLimit)
      .lean()

    const shippingRates = getConfiguredShippingRates()

    const mapProduct = (p: any) => {
      const pricing = computeProductPricing(p, shippingRates)
      return {
        id: String(p._id),
        slug: p.slug || String(p._id),
        name: p.name,
        image: p.image || '/placeholder.svg',
        category: p.category || 'Catalogue',
        price: pricing?.salePrice ?? p.baseCost ?? p.price ?? null,
        currency: p.currency || 'FCFA',
        stockStatus: p.stockStatus,
      }
    }

    return NextResponse.json({
      query: q,
      suggestions: suggestions.map(mapProduct),
      trending: trendingDocs.map(mapProduct),
    })
  } catch (error) {
    console.error('[Search Suggestions] error:', error)
    return NextResponse.json(
      { query: '', suggestions: [], trending: [] },
      { status: 500 }
    )
  }
}
