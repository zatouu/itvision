import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import ProviderPortfolio from '@/lib/models/ProviderPortfolio'
import { getJwtSecretKey } from '@/lib/jwt-secret'

interface DecodedToken {
  userId: string
  role: string
  email: string
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')

  const secret = getJwtSecretKey()
  const { payload } = await jwtVerify(token, secret)

  if (!payload.userId || !payload.role || !payload.email) throw new Error('Token invalide')

  return {
    userId: payload.userId as string,
    role: payload.role as string,
    email: payload.email as string,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const decoded = await verifyToken(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined

    const filter: any = { userId: decoded.userId }
    if (type) filter.type = type

    const items = await ProviderPortfolio.find(filter).sort({ isFeatured: -1, createdAt: -1 }).lean()
    const featured = items.find((i: any) => i.isFeatured) || items[0] || null

    const counts = {
      realisation: 0,
      certification: 0,
      diplome: 0,
    }
    items.forEach((i: any) => {
      const key = i.type as keyof typeof counts
      if (counts[key] !== undefined) counts[key]++
    })

    return NextResponse.json({
      success: true,
      featured,
      items,
      counts,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const decoded = await verifyToken(request)
    const body = await request.json()

    const {
      title,
      description,
      category,
      type,
      images,
      documents,
      isFeatured,
    } = body || {}

    if (!title || !type) {
      return NextResponse.json({ success: false, error: 'Titre et type requis' }, { status: 400 })
    }

    const item = await ProviderPortfolio.create({
      userId: decoded.userId,
      title,
      description,
      category,
      type,
      images: images || [],
      documents: documents || [],
      isFeatured: Boolean(isFeatured),
    })

    if (isFeatured) {
      await ProviderPortfolio.updateMany(
        { userId: decoded.userId, _id: { $ne: item._id } },
        { isFeatured: false }
      )
    }

    return NextResponse.json({ success: true, item })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
}
