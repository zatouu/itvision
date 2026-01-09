import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product, { IProduct } from '@/lib/models/Product.validated'
import { computeProductPricing } from '@/lib/logistics'
import { simulatePricingFromProduct } from '@/lib/pricing1688.refactored'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '24', 10)
    const skip = (page - 1) * limit

    const products = await Product.find({ isPublished: { $ne: false } })
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Product.countDocuments({ isPublished: { $ne: false } })

    const payload = products.map((product: any) => {
      const pricing = computeProductPricing(product)
      return {
        id: String(product._id),
        name: product.name,
        tagline: product.tagline ?? null,
        description: product.description ?? null,
        category: product.category ?? null,
        image: product.image ?? '/file.svg',
        gallery: Array.isArray(product.gallery) && product.gallery.length > 0
          ? product.gallery
          : [product.image ?? '/file.svg'],
        features: Array.isArray(product.features) ? product.features : [],
        requiresQuote: product.requiresQuote ?? false,
        availability: {
          status: product.stockStatus ?? 'preorder',
          label: pricing.availabilityLabel,
          note: pricing.availabilitySubLabel ?? null,
          stockQuantity: product.stockQuantity ?? 0,
          leadTimeDays: product.leadTimeDays ?? null
        },
        logistics: {
          weightKg: product.weightKg ?? null,
          volumeM3: product.volumeM3 ?? null,
          dimensions: product.lengthCm && product.widthCm && product.heightCm
            ? {
                lengthCm: product.lengthCm,
                widthCm: product.widthCm,
                heightCm: product.heightCm
              }
            : null
        },
        pricing,
        // Note: Les informations de sourcing et prix source ne sont pas exposées au public
        // Seul indicateur: si le produit est importé (pour affichage badge "Import")
        isImported: !!(product.price1688 || (product.sourcing?.platform && ['1688', 'alibaba', 'taobao'].includes(product.sourcing.platform))),
        // Configuration achat groupé
        groupBuyEnabled: product.groupBuyEnabled ?? false,
        groupBuyMinQty: product.groupBuyMinQty ?? 10,
        groupBuyTargetQty: product.groupBuyTargetQty ?? 50,
        priceTiers: Array.isArray(product.priceTiers) ? product.priceTiers : [],
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        isFeatured: product.isFeatured ?? false
      }
    })

    return NextResponse.json({ 
      success: true, 
      products: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load catalog' }, { status: 500 })
  }
}

