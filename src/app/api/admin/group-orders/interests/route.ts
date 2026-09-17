/**
 * GET /api/admin/group-orders/interests — demande latente « Préviens-moi ».
 * Agrégat par produit : combien de personnes veulent un achat groupé,
 * et combien de groupes actifs existent déjà pour ce produit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import GroupInterest from '@/lib/models/GroupInterest'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { requireAdminApi } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()

    const [perProduct, globalCount, openByProduct] = await Promise.all([
      GroupInterest.aggregate([
        { $match: { productId: { $ne: null } } },
        { $group: { _id: '$productId', productName: { $first: '$productName' }, interested: { $sum: 1 } } },
        { $sort: { interested: -1 } },
        { $limit: 50 },
      ]),
      GroupInterest.countDocuments({ scope: 'global' }),
      GroupOrder.aggregate([
        { $match: { status: { $in: ['open', 'filled'] }, deadline: { $gte: new Date() } } },
        { $group: { _id: '$product.productId', activeGroups: { $sum: 1 } } },
      ]),
    ])

    const openMap = new Map(openByProduct.map((o: any) => [String(o._id), o.activeGroups]))

    return NextResponse.json({
      success: true,
      globalInterested: globalCount,
      products: perProduct.map((p: any) => ({
        productId: String(p._id),
        productName: p.productName || 'Produit',
        interested: p.interested,
        activeGroups: openMap.get(String(p._id)) || 0,
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/group-orders/interests error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
