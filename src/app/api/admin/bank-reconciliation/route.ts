import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { parseStatementDate, type StatementLine } from '@/lib/finance/bank-statement'
import { matchStatementLines } from '@/lib/finance/bank-reconciliation'

const MAX_LINES = 2000

/**
 * POST /api/admin/bank-reconciliation { lines: [{ id, date, label, amount, reference? }] }
 * Propose les factures à solder pour chaque encaissement d'un relevé bancaire (aucune écriture).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null) as any
    const raw = Array.isArray(body?.lines) ? body.lines : null
    if (!raw || raw.length === 0) return NextResponse.json({ error: 'Aucune ligne de relevé' }, { status: 400 })
    if (raw.length > MAX_LINES) return NextResponse.json({ error: `Relevé trop long (${MAX_LINES} lignes maximum)` }, { status: 400 })

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const lines: StatementLine[] = []
    for (const l of raw) {
      const date = parseStatementDate(String(l?.date ?? ''))
      const amount = Math.round(Number(l?.amount))
      if (!date || date > tomorrow || !Number.isFinite(amount) || amount <= 0 || amount > 1e12) continue
      lines.push({
        id: String(l?.id ?? '').slice(0, 20) || `L${lines.length}`,
        date,
        amount,
        label: String(l?.label ?? '').slice(0, 300),
        reference: typeof l?.reference === 'string' && l.reference.trim() ? l.reference.trim().slice(0, 100) : undefined,
      })
    }
    if (!lines.length) return NextResponse.json({ error: 'Aucun encaissement valide dans le relevé' }, { status: 400 })

    await connectMongoose()
    const { results, openInvoices } = await matchStatementLines(lines)
    return NextResponse.json({ results, openInvoices, ignored: raw.length - lines.length })
  } catch (error) {
    console.error('Erreur POST /api/admin/bank-reconciliation:', error)
    return NextResponse.json({ error: 'Erreur lors du rapprochement' }, { status: 500 })
  }
}
