import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Product from '@/lib/models/Product'
import { z } from 'zod'

const updateSchema = z.object({
  stockQuantity: z.number().int().min(0).optional(),
  stockStatus: z.enum(['in_stock', 'preorder', 'out_of_stock']).optional(),
  sellerName: z.string().trim().min(1).optional(),
  sellerVerified: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()

    const vendor = (await VendorProfile.findOne({ userId: auth.user.id }).lean()) as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }

    const product = await Product.findOne({ _id: id, sellerSlug: vendor.slug })
    if (!product) {
      return NextResponse.json({ success: false, error: 'Produit introuvable ou non associé' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }

    const data = parsed.data
    if (data.stockQuantity !== undefined) product.stockQuantity = data.stockQuantity
    if (data.stockStatus) product.stockStatus = data.stockStatus
    if (data.sellerName !== undefined) product.sellerName = data.sellerName
    if (data.sellerVerified !== undefined) product.sellerVerified = data.sellerVerified

    // Auto-adjust stockStatus if quantity set to zero and not provided
    if (data.stockQuantity === 0 && !data.stockStatus) product.stockStatus = 'out_of_stock'
    if (data.stockQuantity !== undefined && data.stockQuantity > 0 && !data.stockStatus && product.stockStatus === 'out_of_stock') {
      product.stockStatus = 'in_stock'
    }

    await product.save()

    return NextResponse.json({
      success: true,
      product: {
        id: String(product._id),
        name: product.name,
        stockQuantity: product.stockQuantity,
        stockStatus: product.stockStatus,
      },
    })
  } catch (error) {
    console.error('PATCH /api/vendor/products/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
