import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Product from '@/lib/models/Product'
import ReturnRequest from '@/lib/models/ReturnRequest'

// Support vendeur : litiges/retours concernant ses produits.
// Données client limitées au prénom — le règlement du litige reste chez DDM+.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()
    const vendor = await VendorProfile.findOne({ userId: auth.user.id }).lean() as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }

    const products = await Product.find({ sellerSlug: vendor.slug }).select('_id').lean()
    const productIds = products.map(p => String(p._id))

    const requests = productIds.length === 0 ? [] : await ReturnRequest.find({
      'items.productId': { $in: productIds },
    }).sort({ createdAt: -1 }).limit(50).lean() as any[]

    return NextResponse.json({
      success: true,
      requests: requests.map(r => ({
        id: String(r._id),
        orderReference: r.orderReference,
        status: r.status,
        reason: r.reason,
        details: r.details,
        clientName: (r.clientName || 'Client').split(' ')[0],
        items: (r.items || [])
          .filter((i: any) => productIds.includes(i.productId))
          .map((i: any) => ({ name: i.name, qty: i.qty, reason: i.reason })),
        refundAmount: r.refundAmount,
        createdAt: r.createdAt,
      })),
    })
  } catch (error) {
    console.error('GET /api/vendor/support error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
