import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import { z } from 'zod'

const updateSchema = z.object({
  description: z.string().trim().max(1000).optional(),
  logo: z.string().trim().max(500).optional(),
  coverImage: z.string().trim().max(500).optional(),
  ownerEmail: z.string().email('Email invalide').optional(),
  ownerPhone: z.string().trim().min(8, 'Téléphone invalide').max(20).optional(),
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
  socialLinks: z.object({
    whatsapp: z.string().trim().max(30).optional(),
    instagram: z.string().trim().max(100).optional(),
    facebook: z.string().trim().max(200).optional(),
    website: z.string().trim().max(200).optional(),
  }).optional(),
})

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

    const shop = await Shop.findOne({ slug: vendor.slug }).lean() as any
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      shop: {
        id: String(shop._id),
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        logo: shop.logo,
        coverImage: shop.coverImage,
        ownerEmail: shop.ownerEmail,
        ownerPhone: shop.ownerPhone,
        city: shop.city,
        address: shop.address,
        status: shop.status,
        isVerified: shop.isVerified,
        socialLinks: shop.socialLinks || {},
      },
    })
  } catch (error) {
    console.error('GET /api/vendor/shop error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    await connectMongoose()
    const vendor = await VendorProfile.findOne({ userId: auth.user.id }).lean() as any
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Profil vendeur introuvable' }, { status: 404 })
    }

    const data = parsed.data
    const update: any = {}
    for (const key of ['description', 'logo', 'coverImage', 'ownerEmail', 'ownerPhone', 'city', 'address'] as const) {
      if (data[key] !== undefined) update[key] = data[key]
    }
    if (data.socialLinks) {
      for (const [k, v] of Object.entries(data.socialLinks)) {
        if (v !== undefined) update[`socialLinks.${k}`] = v
      }
    }

    const shop = await Shop.findOneAndUpdate({ slug: vendor.slug }, update, { new: true }).lean() as any
    if (!shop) {
      return NextResponse.json({ success: false, error: 'Boutique introuvable' }, { status: 404 })
    }

    // Sync le VendorProfile (utilisé par /vendeur/[slug] et les catalogues)
    const profileUpdate: any = {}
    if (data.description !== undefined) profileUpdate.description = data.description
    if (data.logo !== undefined) profileUpdate.logo = data.logo
    if (data.coverImage !== undefined) profileUpdate.banner = data.coverImage
    if (data.ownerEmail !== undefined) profileUpdate.contactEmail = data.ownerEmail
    if (data.ownerPhone !== undefined) profileUpdate.contactPhone = data.ownerPhone
    if (Object.keys(profileUpdate).length > 0) {
      await VendorProfile.updateOne({ _id: vendor._id }, profileUpdate)
    }

    return NextResponse.json({ success: true, shop: { id: String(shop._id), slug: shop.slug } })
  } catch (error) {
    console.error('PATCH /api/vendor/shop error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
