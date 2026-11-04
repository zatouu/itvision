import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import Shop from '@/lib/models/Shop'
import ShopFollower from '@/lib/models/ShopFollower'

const findShop = async (shopId: string) => {
  const query = mongoose.Types.ObjectId.isValid(shopId)
    ? { $or: [{ _id: shopId }, { slug: shopId }] }
    : { slug: shopId }
  return Shop.findOne({ ...query, status: 'active' }).select('_id slug ownerId').lean() as Promise<any>
}

// État « suivi » du visiteur + nombre total d'abonnés (auth optionnelle)
export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params
    await connectMongoose()
    const shop = await findShop(shopId)
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }
    const followers = await ShopFollower.countDocuments({ shopId: shop._id })
    let following = false
    let isOwner = false
    const auth = await verifyAuthServer(req)
    if (auth?.isAuthenticated && auth.user?.id) {
      isOwner = !!shop.ownerId && String(shop.ownerId) === String(auth.user.id)
      following = isOwner ? false : !!(await ShopFollower.exists({ userId: auth.user.id, shopId: shop._id }))
    }
    return NextResponse.json({ success: true, following, followers, isOwner })
  } catch (e) {
    console.error('GET /api/shops/[shopId]/follow error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// Toggle follow/unfollow (auth requise)
export async function POST(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const auth = await verifyAuthServer(req)
    if (!auth?.isAuthenticated || !auth.user?.id) {
      return NextResponse.json({ success: false, error: 'Connexion requise' }, { status: 401 })
    }
    const { shopId } = await params
    await connectMongoose()
    const shop = await findShop(shopId)
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }
    if (shop.ownerId && String(shop.ownerId) === String(auth.user.id)) {
      return NextResponse.json({ success: false, error: 'Vous ne pouvez pas suivre votre propre boutique' }, { status: 403 })
    }

    const existing = await ShopFollower.findOne({ userId: auth.user.id, shopId: shop._id })
    if (existing) {
      await existing.deleteOne()
    } else {
      await ShopFollower.create({ userId: auth.user.id, shopId: shop._id, shopSlug: shop.slug }).catch((e: any) => {
        if (e?.code !== 11000) throw e
      })
    }
    const followers = await ShopFollower.countDocuments({ shopId: shop._id })
    return NextResponse.json({ success: true, following: !existing, followers })
  } catch (e) {
    console.error('POST /api/shops/[shopId]/follow error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
