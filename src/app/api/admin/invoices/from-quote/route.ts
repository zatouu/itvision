import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { createInvoiceFromQuote } from '@/lib/finance/invoice-from-quote'

/**
 * POST /api/admin/invoices/from-quote { quoteId, dueInDays?, mode?, percent? }
 * Facture brouillon issue d'un devis accepté (voir createInvoiceFromQuote).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    await connectMongoose()
    const result = await createInvoiceFromQuote({
      quoteId: String(body?.quoteId || ''),
      mode: body?.mode,
      percent: body?.percent,
      dueInDays: body?.dueInDays,
      createdBy: auth.user.id,
    })
    if (!result.ok) {
      const { status, ok: _ok, ...rest } = result
      return NextResponse.json(rest, { status })
    }
    const { ok: _ok, total: _total, ...rest } = result
    return NextResponse.json({ success: true, ...rest }, { status: 201 })
  } catch (error: any) {
    console.error('Erreur POST /api/admin/invoices/from-quote:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la facture' }, { status: 500 })
  }
}
