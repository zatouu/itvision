import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Product from '@/lib/models/Product'
import { Order } from '@/lib/models/Order'

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

    const products = await Product.find({ sellerSlug: vendor.slug }).select('_id name price stockQuantity stockStatus sellerSlug sellerName').lean()
    const productIds = products.map(p => String(p._id))
    const productIdSet = new Set(productIds)

    const orders = await Order.find({ 'items.id': { $in: productIds } }).lean()

    let revenue = 0
    let pendingOrdersCount = 0
    let completedOrdersCount = 0

    for (const order of orders as any[]) {
      const isPending = ['pending', 'confirmed', 'processing'].includes(order.status)
      const isCompleted = order.status === 'delivered' && order.paymentStatus === 'completed'
      if (isPending) pendingOrdersCount++
      if (isCompleted) completedOrdersCount++

      for (const item of order.items || []) {
        if (productIdSet.has(item.id)) {
          const qty = typeof item.qty === 'number' ? item.qty : 1
          const price = typeof item.price === 'number' ? item.price : 0
          revenue += qty * price
        }
      }
    }

    const lowStockCount = products.filter((p: any) => {
      if (p.stockStatus === 'out_of_stock') return true
      return typeof p.stockQuantity === 'number' && p.stockQuantity < 5
    }).length

    return NextResponse.json({
      success: true,
      vendor: {
        name: vendor.name,
        slug: vendor.slug,
        verified: vendor.verified,
        rating: vendor.rating,
      },
      stats: {
        productsCount: products.length,
        ordersCount: orders.length,
        pendingOrdersCount,
        completedOrdersCount,
        revenue,
        lowStockCount,
      },
    })
  } catch (error) {
    console.error('GET /api/vendor/stats error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
