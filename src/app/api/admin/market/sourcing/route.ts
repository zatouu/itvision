/**
 * GET /api/admin/market/sourcing
 *   Liste paginée des demandes de sourcing pour l'admin.
 *   Query: ?status=...&search=...&overdue=1&page=1&limit=20
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest from '@/lib/models/SourcingRequest'
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

export async function GET(request: NextRequest) {
  const adm = await requireAdmin(request)
  if (!adm.ok) return NextResponse.json({ error: adm.error }, { status: adm.status })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = (searchParams.get('search') || '').trim()
  const overdue = searchParams.get('overdue') === '1'
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)))

  await connectMongoose()

  const query: any = {}
  if (status && status !== 'all') {
    if (status === 'pending') {
      query.status = { $in: ['new', 'searching', 'proposal_ready'] }
    } else {
      query.status = status
    }
  }
  if (overdue) {
    query.slaDueAt = { $lt: new Date() }
    query.status = { $in: ['new', 'searching', 'proposal_ready'] }
  }
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [
      { reference: re },
      { description: re },
      { title: re },
      { contactName: re },
      { contactPhone: re },
      { contactEmail: re }
    ]
  }

  const [items, total, counts] = await Promise.all([
    SourcingRequest.find(query)
      .sort({ status: 1, slaDueAt: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SourcingRequest.countDocuments(query),
    SourcingRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ])

  const statusCounts: Record<string, number> = {}
  for (const c of counts) statusCounts[c._id] = c.count

  return NextResponse.json({
    success: true,
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    statusCounts
  })
}
