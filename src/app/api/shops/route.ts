import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)))
    const shops = await Shop.find({ status: 'active' })
      .select('-__v')
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

    return NextResponse.json({ success: true, shop }, { status: 201 })
  } catch (err: any) {
    console.error('[shops] POST error:', err)
    if (err.code === 11000) {
      return NextResponse.json({ success: false, error: 'Une boutique avec ce nom/slug existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
