/**
 * GET    /api/admin/market/sourcing/[id]                — détail
 * PATCH  /api/admin/market/sourcing/[id]                — update status / notes / assignment
 * POST   /api/admin/market/sourcing/[id]/proposal       — enregistre + envoie proposition (SMS)
 * POST   /api/admin/market/sourcing/[id]/cancel         — annule la demande (admin)
 *
 * Ce fichier gère GET + PATCH. Les sous-routes sont dans /proposal et /cancel.
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest, { SourcingStatus } from '@/lib/models/SourcingRequest'
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

const ALLOWED_NEXT_STATUSES: SourcingStatus[] = [
  'new',
  'searching',
  'proposal_ready',
  'fulfilled',
  'cancelled',
  'expired'
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adm = await requireAdmin(request)
  if (!adm.ok) return NextResponse.json({ error: adm.error }, { status: adm.status })

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  await connectMongoose()
  const doc = await SourcingRequest.findById(params.id).lean()
  if (!doc) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  return NextResponse.json({ success: true, request: doc })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adm = await requireAdmin(request)
  if (!adm.ok) return NextResponse.json({ error: adm.error }, { status: adm.status })

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  await connectMongoose()
  const doc = await SourcingRequest.findById(params.id)
  if (!doc) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  // Mise à jour ciblée (champs autorisés uniquement)
  if (typeof body.status === 'string' && ALLOWED_NEXT_STATUSES.includes(body.status as SourcingStatus)) {
    doc.status = body.status as SourcingStatus
  }
  if (typeof body.adminNotes === 'string') {
    doc.adminNotes = body.adminNotes.slice(0, 5000)
  }
  if (body.assignToMe === true) {
    doc.assignedToUserId = adm.auth.userId
    doc.assignedAt = new Date()
    if (doc.status === 'new') doc.status = 'searching'
  }
  if (body.assignedToUserId === null) {
    doc.assignedToUserId = undefined
    doc.assignedAt = undefined
  }

  await doc.save()
  return NextResponse.json({ success: true, request: doc.toObject() })
}
