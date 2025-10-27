import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import jwt from 'jsonwebtoken'

function requireManagerRole(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false, status: 401, error: 'Non authentifié' as const }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    const role = String(decoded.role || '').toUpperCase()
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false, status: 403, error: 'Accès refusé' as const }
    return { ok: true }
  } catch {
    return { ok: false, status: 401, error: 'Token invalide' as const }
  }
}

// GET /api/products?search=&category=&limit=20&skip=0
export async function GET(request: NextRequest) {
  try {
    const auth = requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('search') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const query: any = {}
    if (q) query.name = new RegExp(q, 'i')
    if (category) query.category = category

    const [items, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ])

    return NextResponse.json({ success: true, items, total, skip, limit })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST /api/products (create)
export async function POST(request: NextRequest) {
  try {
    const auth = requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { name, category, description, price, currency, image, requiresQuote, deliveryDays } = body || {}
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })

    const created = await Product.create({ name, category, description, price, currency, image, requiresQuote, deliveryDays })
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

// PATCH /api/products (update)
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { id, ...data } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    await Product.updateOne({ _id: id }, { $set: data })
    const updated = await Product.findById(id).lean()
    return NextResponse.json({ success: true, item: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE /api/products?id=
export async function DELETE(request: NextRequest) {
  try {
    const auth = requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    await Product.deleteOne({ _id: id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}


