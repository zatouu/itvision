import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import { z } from 'zod'

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

const createSchema = z.object({
  name: z.string().trim().min(3, 'Nom trop court (min. 3 caractères)').max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(100).optional(),
  price: z.number().int().min(100, 'Prix minimum : 100 F'),
  stockQuantity: z.number().int().min(0).default(0),
  image: z.string().trim().max(500).optional(),
  gallery: z.array(z.string().trim().max(500)).max(8).optional(),
})

// Le produit vendeur démarre non publié — validation admin avant mise en ligne.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    await connectMongoose()
    const vendor = await VendorProfile.findOne({ userId: auth.user.id }).lean() as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }
    const shop = await Shop.findOne({ slug: vendor.slug }).select('_id status isVerified').lean() as any
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    const { name, description, category, price, stockQuantity, image, gallery } = parsed.data
    const product = await Product.create({
      name,
      description,
      category,
      price,
      currency: 'FCFA',
      image,
      gallery: gallery || (image ? [image] : []),
      stockQuantity,
      stockStatus: stockQuantity > 0 ? 'in_stock' : 'out_of_stock',
      sellerName: vendor.name,
      sellerSlug: vendor.slug,
      sellerVerified: !!shop.isVerified,
      sellerRating: vendor.rating || 0,
      shopId: shop._id,
      isPublished: false,
      channels: ['marketplace'],
      condition: 'new',
    })

    return NextResponse.json({
      success: true,
      product: { id: String(product._id), name: product.name, isPublished: false },
      message: 'Produit créé — il sera visible après validation par nos équipes.',
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/vendor/products error:', error)
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'Un produit avec cet identifiant existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
