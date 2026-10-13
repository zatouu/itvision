import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { computeProductPricing } from '@/lib/logistics'
import { readSharedPricing, configuredShippingRates } from '@/lib/pricing/shared-settings'
import { accentInsensitiveRegex, stripAccents } from '@/lib/search/accents'

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
    let groups: any[] = []

    if (q.length >= 2) {
      const regex = { $regex: accentInsensitiveRegex(q), $options: 'i' }
      const qFolded = stripAccents(q)
      const suggestionQuery = {
        isPublished: { $ne: false },
        $or: [
          { name: regex },
          { tagline: regex },
          { tags: { $in: qFolded !== q ? [q, qFolded] : [q] } },
          { 'sourcing.title': regex },
        ],
      }

      const [docs, groupDocs] = await Promise.all([
        Product.find(suggestionQuery)
          .select(projection)
          .sort({ isFeatured: -1, soldCount: -1, viewCount: -1, createdAt: -1 })
          .limit(limit)
          .lean(),
        GroupOrder.find({ status: 'open', deadline: { $gt: new Date() }, 'product.name': regex })
          .select('groupId product.name product.image currentUnitPrice currentQty targetQty deadline')
          .sort({ deadline: 1 })
          .limit(3)
          .lean(),
      ])

      suggestions = docs
      groups = (groupDocs as any[]).map(g => ({
        groupId: g.groupId,
        name: g.product?.name || 'Achat groupé',
        image: g.product?.image || '/placeholder.svg',
        price: g.currentUnitPrice ?? null,
        currentQty: g.currentQty || 0,
        targetQty: g.targetQty || 0,
        deadline: g.deadline,
      }))
    }

    // Trending: produits populaires / vedettes pour affichage quand le champ est vide
    const trendingLimit = Math.min(parseInt(searchParams.get('trendingLimit') || '6', 10), 12)
    const trendingDocs = await Product.find({ isPublished: { $ne: false } })
      .select(projection)
      .sort({ isFeatured: -1, soldCount: -1, viewCount: -1, createdAt: -1 })
      .limit(trendingLimit)
      .lean()

    const pricingSettings = await readSharedPricing()
    const shippingRates = configuredShippingRates(pricingSettings.config)

    const mapProduct = (p: any) => {
      const pricing = computeProductPricing(p, shippingRates, undefined, pricingSettings.config.defaults.singleImportServiceFeeRate, pricingSettings.config.defaults)
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
      groups,
      trending: trendingDocs.map(mapProduct),
    })
  } catch (error) {
    console.error('[Search Suggestions] error:', error)
    return NextResponse.json(
      { query: '', suggestions: [], groups: [], trending: [] },
      { status: 500 }
    )
  }
}
