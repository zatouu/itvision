/**
 * GET   /api/admin/market/reviews?status=pending|approved|rejected — avis produits à modérer
 * PATCH /api/admin/market/reviews { id, status: 'approved' | 'rejected' }
 */
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import Review from '@/lib/models/Review'
import Product from '@/lib/models/Product'

const ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER']
const STATUSES = ['pending', 'approved', 'rejected']

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const raw = new URL(request.url).searchParams.get('status') || 'pending'
  const status = STATUSES.includes(raw) ? raw : 'pending'

  await connectMongoose()
  const [reviews, counts] = await Promise.all([
    Review.find({ status }).sort({ createdAt: status === 'pending' ? 1 : -1 }).limit(200).lean() as Promise<any[]>,
    Review.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  const productIds = [...new Set(reviews.map(r => r.productId).filter((id: string) => mongoose.isValidObjectId(id)))]
  const products = await Product.find({ _id: { $in: productIds } }).select('name image').lean() as any[]
  const byId = new Map(products.map(p => [String(p._id), p]))

  return NextResponse.json({
    success: true,
    counts: Object.fromEntries((counts as any[]).map(c => [c._id, c.n])),
    reviews: reviews.map(r => ({
      id: String(r._id),
      productId: r.productId,
      productName: byId.get(r.productId)?.name || 'Produit',
      productImage: byId.get(r.productId)?.image || null,
      userName: r.userName,
      rating: r.rating,
      title: r.title || null,
      comment: r.comment,
      photos: r.photos || [],
      verified: !!r.verified,
      status: r.status,
      createdAt: r.createdAt,
    })),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => ({}))
  const id = String(body?.id || '')
  const status = String(body?.status || '')
  if (!mongoose.isValidObjectId(id) || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Paramètres invalides' }, { status: 400 })
  }

  await connectMongoose()
  const updated = await Review.findByIdAndUpdate(id, { $set: { status } }, { new: true }).select('_id status').lean()
  if (!updated) return NextResponse.json({ success: false, error: 'Avis introuvable' }, { status: 404 })
  return NextResponse.json({ success: true })
}
