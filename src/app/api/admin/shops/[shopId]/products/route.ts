import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import { requireAdminApi } from '@/lib/api-auth'
import mongoose from 'mongoose'

interface RouteContext {
  params: Promise<{ shopId: string }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    const { shopId } = await context.params
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json({ success: false, error: 'ID boutique invalide' }, { status: 400 })
    }

    const body = await req.json()
    const { productIds, action } = body as { productIds: string[]; action: 'assign' | 'remove' }
    if (!Array.isArray(productIds) || productIds.length === 0 || !['assign', 'remove'].includes(action)) {
      return NextResponse.json({ success: false, error: 'productIds et action requis' }, { status: 400 })
    }

    await connectMongoose()
    const shop = await Shop.findById(shopId).lean()
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    const validIds = productIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id))

    const update = action === 'assign'
      ? { $set: { shopId: new mongoose.Types.ObjectId(shopId) } }
      : { $unset: { shopId: 1 } }

    const result = await Product.updateMany({ _id: { $in: validIds } }, update)

    return NextResponse.json({ success: true, modified: result.modifiedCount })
  } catch (err) {
    console.error('[admin/shops/products] PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
