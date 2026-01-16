import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'

function requireManagerRole(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    const role = String(decoded.role || '').toUpperCase()
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Token invalide' as const }
  }
}

export async function GET(request: NextRequest) {
  const auth = requireManagerRole(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  try {
    await connectMongoose()

    const rows = await Product.aggregate([
      {
        $match: {
          category: { $exists: true, $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 500 }
    ])

    const items = rows
      .map((r: any) => ({ category: String(r._id), count: Number(r.count) || 0 }))
      .filter((r: any) => r.category)

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET /api/products/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
