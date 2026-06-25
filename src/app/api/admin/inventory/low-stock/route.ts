import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const threshold = Math.max(0, Number(searchParams.get('threshold') || process.env.LOW_STOCK_THRESHOLD || 10))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)))

    const products = await Product.find({
      isPublished: { $ne: false },
      stockQuantity: { $gt: 0, $lte: threshold }
    })
      .sort({ stockQuantity: 1, updatedAt: -1 })
      .limit(limit)
      .select('name category stockQuantity stockStatus price image')
      .lean()

    const outOfStock = await Product.find({
      isPublished: { $ne: false },
      $or: [
        { stockQuantity: { $lte: 0 } },
        { stockStatus: 'out_of_stock' }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('name category stockQuantity stockStatus price image')
      .lean()

    return NextResponse.json({
      success: true,
      threshold,
      lowStock: products.map((p: any) => ({
        id: String(p._id),
        name: p.name,
        category: p.category,
        stockQuantity: p.stockQuantity || 0,
        stockStatus: p.stockStatus,
        price: p.price,
        image: p.image
      })),
      outOfStock: outOfStock.map((p: any) => ({
        id: String(p._id),
        name: p.name,
        category: p.category,
        stockQuantity: p.stockQuantity || 0,
        stockStatus: p.stockStatus,
        price: p.price,
        image: p.image
      }))
    })
  } catch (err) {
    console.error('[admin/inventory] Erreur récupération stock bas:', err)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du stock' },
      { status: 500 }
    )
  }
}
