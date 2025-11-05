import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { computeProductPricing } from '@/lib/logistics'

export async function GET() {
  try {
    await connectMongoose()

    const products = await Product.find({ isPublished: { $ne: false } })
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(120)
      .lean()

    const payload = products.map((product) => {
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
        sourcing: product.sourcing && {
          platform: product.sourcing.platform ?? null,
          supplierName: product.sourcing.supplierName ?? null,
          productUrl: product.sourcing.productUrl ?? null
        },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }
    })

    return NextResponse.json({ success: true, products: payload })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load catalog' }, { status: 500 })
  }
}

