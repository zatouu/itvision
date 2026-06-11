import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { ExternalSearchLog } from '@/lib/models/ExternalSearchLog'
import { requireAuth } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])

async function requireAdmin(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!ADMIN_ROLES.has(String(auth.role).toUpperCase())) {
      return { ok: false as const, status: 403, error: 'Accès refusé' }
    }
    return { ok: true as const, auth }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' }
  }
}

/**
 * GET /api/admin/market/external-search-logs
 *
 * Historique des recherches externes 1688/AliExpress.
 * Query params:
 *   status   — 'success' | 'blocked' | 'no_results' | 'error'
 *   limit    — nombre max (default 50)
 *   offset   — pagination (default 0)
 */
export async function GET(request: NextRequest) {
  const adm = await requireAdmin(request)
  if (!adm.ok) return NextResponse.json({ success: false, error: adm.error }, { status: adm.status })

  await connectMongoose()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as any
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const filter: any = {}
  if (status) filter.status = status

  const [items, total] = await Promise.all([
    ExternalSearchLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    ExternalSearchLog.countDocuments(filter),
  ])

  const statusCounts = await ExternalSearchLog.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  return NextResponse.json({
    success: true,
    items: items.map((i: any) => ({
      ...i,
      _id: String(i._id),
    })),
    total,
    offset,
    limit,
    statusCounts: statusCounts.reduce((acc: Record<string, number>, s: any) => {
      acc[s._id] = s.count
      return acc
    }, {}),
  })
}
