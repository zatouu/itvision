import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product.validated'
import { computeProductPricing } from '@/lib/logistics'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'
import mongoose from 'mongoose'

interface RouteContext {
  params: Promise<{ shopId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { shopId } = await context.params
    await connectMongoose()

    const shopQuery = mongoose.Types.ObjectId.isValid(shopId)
      ? { _id: new mongoose.Types.ObjectId(shopId), status: 'active' }
      : { slug: shopId, status: 'active' }
    const shop = await Shop.findOne(shopQuery).lean() as any
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '24', 10)
    const skip = (page - 1) * limit

    const filter: any = { shopId: shop._id, isPublished: { $ne: false } }
    const category = (searchParams.get('category') || '').trim()
    if (category) filter.category = category

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ])

    const shippingRates = getConfiguredShippingRates()
    const items = products.map((p: any) => {
      const pricing = computeProductPricing(p, shippingRates)
      return {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        category: p.category,
        image: p.image,
        price: pricing.salePrice ?? pricing.baseCost ?? p.price ?? null,
        currency: pricing.currency,
        stockStatus: p.stockStatus,
        stockQuantity: p.stockQuantity,
        isFeatured: p.isFeatured
      }
    })

    return NextResponse.json({
      success: true,
      shop: { id: String(shop._id), name: shop.name, slug: shop.slug, logo: shop.logo },
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (err) {
    console.error('[shop products] GET error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
