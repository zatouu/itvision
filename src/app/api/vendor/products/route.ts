import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Product from '@/lib/models/Product'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()

    const vendor = (await VendorProfile.findOne({ userId: auth.user.id }).lean()) as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const skip = (page - 1) * limit

    const products = await Product.find({ sellerSlug: vendor.slug })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name image price stockQuantity stockStatus sellerSlug sellerVerified sellerRating')
      .lean()

    const payload = (products as any[]).map(p => ({
      id: String(p._id),
      name: p.name,
      image: p.image || '/placeholder.svg',
      price: p.price,
      stockQuantity: p.stockQuantity ?? 0,
      stockStatus: p.stockStatus,
      sellerSlug: p.sellerSlug,
      sellerVerified: p.sellerVerified,
      sellerRating: p.sellerRating,
    }))

    return NextResponse.json({ success: true, products: payload })
  } catch (error) {
    console.error('GET /api/vendor/products error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
