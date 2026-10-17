import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { getBrandFromHost } from '@/lib/branding'
import { OPEN_INVOICE_STATUSES } from '@/lib/finance/billing'
import { sendInvoiceReminder } from '@/lib/finance/invoice-reminders'

const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000

// POST /api/admin/invoices/[id]/remind — relance manuelle du client (PDF joint, reste dû)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectMongoose()
  const invoice = await AdminInvoice.findById(id).lean() as any
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (!OPEN_INVOICE_STATUSES.includes(invoice.status)) {
    return NextResponse.json({ error: 'Seule une facture émise non soldée peut être relancée' }, { status: 409 })
  }
  const last = (invoice.reminders || []).reduce((max: number, r: any) => Math.max(max, new Date(r.sentAt).getTime() || 0), 0)
  if (Date.now() - last < MIN_INTERVAL_MS) {
    return NextResponse.json({ error: 'Une relance a déjà été envoyée il y a moins de 24 h' }, { status: 429 })
  }

  try {
    const result = await sendInvoiceReminder(invoice, 'manual', getBrandFromHost(request.nextUrl.host))
    if (!result.sent) return NextResponse.json({ error: result.reason }, { status: 400 })
    return NextResponse.json({ success: true, to: result.to, copyTo: (result as any).copyTo })
  } catch (error) {
    console.error('Erreur POST /api/admin/invoices/[id]/remind:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi de la relance" }, { status: 500 })
  }
}
