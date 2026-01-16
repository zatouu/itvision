import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Product, { IProduct } from '@/lib/models/Product.validated'
import { formatProductDetail, formatSimilarProducts } from '@/lib/catalog-format'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'

const toObjectId = (value: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) return null
  return new mongoose.Types.ObjectId(value)
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()

    const { id } = await context.params
    const objectId = toObjectId(id)
    if (!objectId) {
      return NextResponse.json({ success: false, error: 'Invalid product identifier' }, { status: 400 })
    }

    const productDoc = await Product.findById(objectId).lean()
    if (!productDoc || Array.isArray(productDoc)) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }
    const product = productDoc as unknown as IProduct

    const similarQuery: Record<string, unknown> = {
      _id: { $ne: product._id }
    }
    if (product.category) {
      similarQuery.category = product.category
    }

    const similarProducts = await Product.find(similarQuery)
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(6)
      .lean()

    const shippingRates = getConfiguredShippingRates()

    return NextResponse.json({
      success: true,
      product: formatProductDetail(product, shippingRates),
      similar: formatSimilarProducts(similarProducts, shippingRates)
    })
  } catch (error) {
    console.error('catalog product detail error', error)
    return NextResponse.json({ success: false, error: 'Unable to load product detail' }, { status: 500 })
  }
}
