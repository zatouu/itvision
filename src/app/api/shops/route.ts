import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import User from '@/lib/models/User'
import VendorProfile from '@/lib/models/VendorProfile'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)))
    // Champs publics uniquement — ownerEmail/ownerPhone/commissionRate restent privés
    const shops = await Shop.find({ status: 'active' })
      .select('name slug description logo coverImage isVerified categories socialLinks address city country createdAt')
      .sort({ isVerified: -1, name: 1 })
      .limit(limit)
      .lean()
    return NextResponse.json({ success: true, shops })
  } catch (err) {
    console.error('[shops] GET error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    await connectMongoose()
    const body = await req.json()
    const { name, description, logo, ownerEmail, ownerPhone, address, city } = body
    if (!name) {
      return NextResponse.json({ success: false, error: 'Le nom de la boutique est requis' }, { status: 400 })
    }

    const shop = await Shop.create({
      name,
      description,
      logo,
      ownerEmail,
      ownerPhone,
      address,
      city
    })

    // Lier au compte propriétaire si l'email correspond à un utilisateur :
    // VendorProfile + ownerId + rôle VENDOR — sinon la boutique reste orpheline
    // et le propriétaire n'a jamais accès à /espace-vendeur.
    let ownerLinked = false
    if (ownerEmail) {
      const owner = await User.findOne({ email: String(ownerEmail).toLowerCase().trim() })
      if (owner) {
        shop.ownerId = owner._id
        await shop.save()

        let vp = await VendorProfile.findOne({ userId: owner._id })
        if (!vp) {
          vp = await VendorProfile.create({
            userId: owner._id,
            name: shop.name,
            slug: shop.slug,
            description: shop.description,
            logo: shop.logo,
            banner: shop.coverImage,
            contactEmail: shop.ownerEmail,
            contactPhone: shop.ownerPhone || owner.phone,
            verified: !!shop.isVerified,
            rating: 0,
            commissionRate: shop.commissionRate ?? 0,
          })
        }
        owner.vendorProfileId = vp._id
        if (!['ADMIN', 'SUPER_ADMIN'].includes(owner.role)) {
          owner.role = 'VENDOR'
        }
        await owner.save()
        ownerLinked = true
      }
    }

    return NextResponse.json({ success: true, shop, ownerLinked }, { status: 201 })
  } catch (err: any) {
    console.error('[shops] POST error:', err)
    if (err.code === 11000) {
      return NextResponse.json({ success: false, error: 'Une boutique avec ce nom/slug existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
