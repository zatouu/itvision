import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
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
    const { status, isVerified } = body

    await connectMongoose()
    const update: any = {}
    if (status) update.status = status
    if (typeof isVerified === 'boolean') update.isVerified = isVerified

    const shop = await Shop.findByIdAndUpdate(shopId, update, { new: true }).lean()
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, shop })
  } catch (err) {
    console.error('[admin/shops] PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
