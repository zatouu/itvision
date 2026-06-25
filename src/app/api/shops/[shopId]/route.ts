import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import mongoose from 'mongoose'

interface RouteContext {
  params: Promise<{ shopId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { shopId } = await context.params
    await connectMongoose()

    const query = mongoose.Types.ObjectId.isValid(shopId)
      ? { _id: new mongoose.Types.ObjectId(shopId), status: 'active' }
      : { slug: shopId, status: 'active' }

    const shop = await Shop.findOne(query).select('-__v').lean()
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, shop })
  } catch (err) {
    console.error('[shop] GET error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
