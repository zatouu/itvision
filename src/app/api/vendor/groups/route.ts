import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'

// Groupes d'achat actifs sur les produits du vendeur — fill-rate, deadline,
// participants (sans données personnelles : prénom + qté uniquement).
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

    const products = await Product.find({ sellerSlug: vendor.slug }).select('_id name image price').lean() as any[]
    const productIds = products.map(p => p._id)

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, groups: [] })
    }

    const groups = await GroupOrder.find({
      $or: [
        { 'product.productId': { $in: productIds } },
        { 'productId': { $in: productIds } },
      ],
      status: { $in: ['open', 'filled', 'ordering', 'ordered'] },
    }).sort({ deadline: 1 }).limit(50).lean() as any[]

    return NextResponse.json({
      success: true,
      groups: groups.map(g => ({
        id: String(g._id),
        groupId: g.groupId,
        productName: g.product?.name || 'Produit',
        image: g.product?.image,
        status: g.status,
        currentQty: g.currentQty,
        targetQty: g.targetQty,
        progress: g.targetQty > 0 ? Math.min(100, Math.round((g.currentQty / g.targetQty) * 100)) : 0,
        deadline: g.deadline,
        currentUnitPrice: g.currentUnitPrice,
        participantsCount: (g.participants || []).length,
        participants: (g.participants || []).map((p: any) => ({
          firstName: (p.name || 'Client').split(' ')[0],
          qty: p.qty || 1,
          status: p.paymentStatus,
        })),
      })),
    })
  } catch (error) {
    console.error('GET /api/vendor/groups error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
