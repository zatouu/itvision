import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import CreditNote from '@/lib/models/CreditNote'
import { logAuditEvent } from '@/lib/audit'

/** POST /api/admin/credit-notes/[id]/refund { date?, method? } — trop-perçu rendu au client. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  const body = await request.json().catch(() => ({})) as any
  const date = body?.date ? new Date(String(body.date)) : new Date()
  if (isNaN(date.getTime())) return NextResponse.json({ error: 'Date invalide' }, { status: 400 })

  await connectMongoose()
  const saved = await CreditNote.findOneAndUpdate(
    { _id: id, refundStatus: 'pending' },
    { $set: { refundStatus: 'refunded', refundedAt: date, refundMethod: typeof body?.method === 'string' ? body.method.slice(0, 50) : undefined } },
    { new: true }
  ).lean() as any
  if (!saved) return NextResponse.json({ error: 'Aucun remboursement en attente sur cet avoir' }, { status: 409 })

  void logAuditEvent({
    entityType: 'CreditNote',
    entityId: saved._id,
    action: 'refunded',
    userId: auth.user.id,
    userRole: auth.user.role,
    metadata: { numero: saved.numero, amount: saved.refundAmount },
  })

  return NextResponse.json({ success: true, creditNote: saved })
}
