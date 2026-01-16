import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { requireAdminApi } from '@/lib/api-auth'
import Product from '@/lib/models/Product'
import mongoose from 'mongoose'

function generateGroupId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `GRP-${timestamp}-${random}`
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const includeExpired = searchParams.get('includeExpired')

    const query: any = {}

    if (status && status !== 'all') {
      query.status = status
    }

    if (!includeExpired || includeExpired === '0' || includeExpired === 'false') {
      query.deadline = { $gte: new Date() }
    }

    const groups = await GroupOrder.find(query)
      .select('-participants.chatAccessTokenHash -participants.chatAccessTokenCreatedAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    return NextResponse.json({ success: true, groups })
  } catch (error) {
    console.error('Erreur GET /api/admin/group-orders:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()

    const body = await request.json().catch(() => ({}))
    const productId = typeof body?.productId === 'string' ? body.productId : null

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, error: 'productId invalide' }, { status: 400 })
    }

    const minQty = Number(body?.minQty)
    const targetQty = Number(body?.targetQty)
    const maxQty = body?.maxQty !== undefined && body?.maxQty !== null ? Number(body.maxQty) : undefined
    const maxParticipants = body?.maxParticipants !== undefined && body?.maxParticipants !== null ? Number(body.maxParticipants) : undefined

    if (!Number.isFinite(minQty) || minQty < 1) {
      return NextResponse.json({ success: false, error: 'minQty invalide' }, { status: 400 })
    }
    if (!Number.isFinite(targetQty) || targetQty < minQty) {
      return NextResponse.json({ success: false, error: 'targetQty invalide (doit être >= minQty)' }, { status: 400 })
    }
    if (maxQty !== undefined) {
      if (!Number.isFinite(maxQty) || maxQty < targetQty) {
        return NextResponse.json({ success: false, error: 'maxQty invalide (doit être >= targetQty)' }, { status: 400 })
      }
    }
    if (maxParticipants !== undefined) {
      if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
        return NextResponse.json({ success: false, error: 'maxParticipants invalide' }, { status: 400 })
      }
    }

    const deadlineRaw = typeof body?.deadline === 'string' ? body.deadline : null
    const deadline = deadlineRaw ? new Date(deadlineRaw) : null
    if (!deadline || Number.isNaN(deadline.getTime())) {
      return NextResponse.json({ success: false, error: 'deadline invalide' }, { status: 400 })
    }

    const status = typeof body?.status === 'string' ? String(body.status) : 'open'
    const allowedStatus = ['draft', 'open', 'filled', 'ordering', 'ordered', 'shipped', 'delivered', 'cancelled']
    if (!allowedStatus.includes(status)) {
      return NextResponse.json({ success: false, error: 'status invalide' }, { status: 400 })
    }

    const shippingMethod = typeof body?.shippingMethod === 'string' ? body.shippingMethod : 'maritime_60j'
    const allowedShipping = ['maritime_60j', 'air_15j', 'express_3j']
    if (!allowedShipping.includes(shippingMethod)) {
      return NextResponse.json({ success: false, error: 'shippingMethod invalide' }, { status: 400 })
    }

    const createdByName = typeof body?.createdBy?.name === 'string' ? body.createdBy.name.trim() : ''
    const createdByPhone = typeof body?.createdBy?.phone === 'string' ? body.createdBy.phone.trim() : ''
    const createdByEmail = typeof body?.createdBy?.email === 'string' ? body.createdBy.email.trim() : undefined
    if (!createdByName || !createdByPhone) {
      return NextResponse.json({ success: false, error: 'createdBy.name et createdBy.phone requis' }, { status: 400 })
    }

    const description = typeof body?.description === 'string' ? body.description.trim() : undefined
    const internalNotes = typeof body?.internalNotes === 'string' ? body.internalNotes.trim() : undefined

    const product = await Product.findById(productId).lean()
    if (!product) {
      return NextResponse.json({ success: false, error: 'Produit non trouvé' }, { status: 404 })
    }

    const basePrice = typeof (product as any).price === 'number' ? (product as any).price : 0
    const priceTiers = Array.isArray((product as any).priceTiers) ? (product as any).priceTiers : []

    const group = await GroupOrder.create({
      groupId: generateGroupId(),
      status,
      product: {
        productId: new mongoose.Types.ObjectId(productId),
        name: (product as any).name,
        image: (product as any).image,
        basePrice,
        currency: (product as any).currency || 'FCFA'
      },
      minQty,
      targetQty,
      currentQty: 0,
      maxQty,
      priceTiers,
      currentUnitPrice: basePrice,
      participants: [],
      maxParticipants,
      deadline,
      shippingMethod,
      description,
      internalNotes,
      createdBy: {
        userId: auth.user?.id ? new mongoose.Types.ObjectId(auth.user.id) : undefined,
        name: createdByName,
        phone: createdByPhone,
        email: createdByEmail
      }
    })

    return NextResponse.json({ success: true, group })
  } catch (error) {
    console.error('Erreur POST /api/admin/group-orders:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
