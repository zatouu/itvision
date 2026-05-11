import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import AuditLog from '@/lib/models/AuditLog'
import { verifyJwtPayload } from '@/lib/jwt'

async function verifyAdminToken(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('admin-auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) throw new Error('Token manquant')
  const payload = await verifyJwtPayload(token)
  const normalizedRole = String((payload as any).role || '').toUpperCase()
  if (normalizedRole !== 'ADMIN' && normalizedRole !== 'SUPERVISOR') {
    throw new Error('Accès non autorisé')
  }
  return payload
}

// GET — Audit trail avec filtres
export async function GET(request: NextRequest) {
  try {
    await verifyAdminToken(request)
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
  } catch (error: any) {
    const status = error.message === 'Accès non autorisé' || error.message === 'Token manquant' ? 403 : 500
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status })
  }
}
