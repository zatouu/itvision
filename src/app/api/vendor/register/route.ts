import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import User from '@/lib/models/User'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthServer(req)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 })
    }

    await connectMongoose()

    const user = await User.findById(auth.user.id)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const existingProfile = await VendorProfile.findOne({ userId: user._id }).lean()
    if (existingProfile) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà une boutique' }, { status: 409 })
    }

    const body = await req.json()
    const { name, description, contactEmail, contactPhone } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Le nom de la boutique est requis (min. 2 caractères)' }, { status: 400 })
    }

    const cleanName = name.trim()
    const slug = slugify(cleanName)

    const slugTaken = await VendorProfile.findOne({ slug }).lean() as any
    if (slugTaken) {
      return NextResponse.json({ success: false, error: 'Une boutique avec ce nom existe déjà' }, { status: 409 })
    }

    const vendor = await VendorProfile.create({
      userId: user._id,
      name: cleanName,
      slug,
      description: description ? String(description).trim() : undefined,
      contactEmail: contactEmail ? String(contactEmail).trim() : user.email,
      contactPhone: contactPhone ? String(contactPhone).trim() : user.phone,
      verified: false,
      rating: 0,
      commissionRate: 0,
    })

    await Shop.create({
      name: cleanName,
      slug,
      description: description ? String(description).trim() : undefined,
      ownerId: user._id,
      ownerEmail: contactEmail ? String(contactEmail).trim() : user.email,
      ownerPhone: contactPhone ? String(contactPhone).trim() : user.phone,
      status: 'active',
      isVerified: false,
    })

    user.role = 'VENDOR'
    user.vendorProfileId = vendor._id as mongoose.Types.ObjectId
    await user.save()

    return NextResponse.json({
      success: true,
      vendor: {
        id: String(vendor._id),
        name: vendor.name,
        slug: vendor.slug,
      },
    })
  } catch (error: any) {
    console.error('[vendor/register] error:', error)
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: 'Une boutique avec ce nom existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
