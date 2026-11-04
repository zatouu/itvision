import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import AuditLog from '@/lib/models/AuditLog'
import { requireApiUser, authErrorResponse, ADMIN_ROLES } from '@/lib/api-auth'

// GET — Audit trail avec filtres
export async function GET(request: NextRequest) {
  try {
    await requireApiUser(request, ADMIN_ROLES)
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const skip = parseInt(searchParams.get('skip') || '0')

    const query: any = {}
    if (entityType) query.entityType = entityType
    if (entityId) query.entityId = new mongoose.Types.ObjectId(entityId)
    if (userId) query.userId = new mongoose.Types.ObjectId(userId)
    if (action) query.action = action

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query)
    ])

    return NextResponse.json({ success: true, logs, total, limit, skip })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('[GET /api/admin/audit]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
