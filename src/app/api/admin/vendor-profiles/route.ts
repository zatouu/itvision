import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import VendorProfile from '@/lib/models/VendorProfile'
import User from '@/lib/models/User'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  commissionRate: z.number().min(0).max(100).default(0),
  verified: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(0),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(['ADMIN', 'SUPER_ADMIN'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }

    const data = parsed.data

    const user = await User.findById(data.userId)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const existing = (await VendorProfile.findOne({ userId: user._id }).lean()) as any

    const update: any = {
      userId: user._id,
      name: data.name,
      description: data.description,
      logo: data.logo,
      banner: data.banner,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      commissionRate: data.commissionRate,
      verified: data.verified,
      rating: data.rating,
    }

    let profile
    if (existing) {
      profile = await VendorProfile.findByIdAndUpdate(existing._id, update, { new: true })
    } else {
      profile = await VendorProfile.create(update)
    }

    user.role = 'VENDOR'
    user.vendorProfileId = profile._id
    await user.save()

    return NextResponse.json({ success: true, vendor: profile })
  } catch (error) {
    console.error('POST /api/admin/vendor-profiles error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)

    const vendors = await VendorProfile.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    return NextResponse.json({ success: true, vendors })
  } catch (error) {
    console.error('GET /api/admin/vendor-profiles error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
