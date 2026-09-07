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

    const products = await Product.find({ sellerSlug: vendor.slug }).select('_id').lean()
    const productIds = products.map(p => String(p._id))

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, orders: [] })
    }

    const { searchParams } = new URL(req.url)
    const rawStatus = searchParams.get('status')
    const status = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(rawStatus || '') ? rawStatus : undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const skip = (page - 1) * limit

    const match: any = { 'items.id': { $in: productIds } }
    if (status) match.status = status

    const orders = await Order.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const payload = (orders as any[]).map(order => {
      const vendorItems = (order.items || []).filter((item: any) => productIds.includes(item.id))
      const vendorTotal = vendorItems.reduce((sum: number, item: any) => sum + (item.qty * item.price), 0)
      return {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: vendorTotal,
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: vendorItems.map((item: any) => ({
          productId: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price,
        })),
      }
    })

    return NextResponse.json({ success: true, orders: payload })
  } catch (error) {
    console.error('GET /api/vendor/orders error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
