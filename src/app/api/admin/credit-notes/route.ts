import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import CreditNote from '@/lib/models/CreditNote'

export const dynamic = 'force-dynamic'

// GET /api/admin/credit-notes[?invoiceId=&refundStatus=]
export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const filter: Record<string, unknown> = {}
  const invoiceId = searchParams.get('invoiceId')
  if (invoiceId) {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return NextResponse.json({ error: 'invoiceId invalide' }, { status: 400 })
    filter.invoiceId = new mongoose.Types.ObjectId(invoiceId)
  }
  const refundStatus = searchParams.get('refundStatus')
  if (refundStatus && ['none', 'pending', 'refunded'].includes(refundStatus)) filter.refundStatus = refundStatus

  await connectMongoose()
  const creditNotes = await CreditNote.find(filter).sort({ date: -1 }).limit(500).lean()
  return NextResponse.json({ creditNotes })
}
