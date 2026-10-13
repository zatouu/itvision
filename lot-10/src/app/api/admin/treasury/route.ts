import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import AdminQuote from '@/lib/models/AdminQuote'
import Project from '@/lib/models/Project'
import { invoiceBalance } from '@/lib/finance/billing'
import {
  computeMarketplaceFinance, computeXeuyFinance, consolidateGlobal,
  loadCorporateLedger, summarizeCorporate, invoiceCashEntries, expenseCashEntries, refundsInRange,
} from '@/lib/finance/domain-finance'

export const dynamic = 'force-dynamic'

function toDate(value: string | null): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), 0, 1)
    const startDate = toDate(searchParams.get('startDate')) || defaultStart
    const endDate = toDate(searchParams.get('endDate')) || now

    const dateFilter = { $gte: startDate, $lte: endDate }

    const [ledger, quotes, invoicedQuoteIds, projects, marketplace, xeuy] = await Promise.all([
      // Factures/dépenses corporate : lib partagée avec le digest (encaissements en date de paiement)
      loadCorporateLedger(dateFilter),
      AdminQuote.find({ date: dateFilter }).select({
        numero: 1, date: 1, status: 1, total: 1, projectId: 1, clientCompanyId: 1
      }).lean() as any,
      AdminInvoice.distinct('quoteId', { quoteId: { $exists: true, $ne: null }, status: { $ne: 'cancelled' } }),
      Project.find().select({ name: 1, status: 1, value: 1, clientId: 1, clientCompanyId: 1 }).lean() as any,
      // Finance isolée par domaine — lib partagée (source unique des agrégats)
      computeMarketplaceFinance(dateFilter),
      computeXeuyFinance(dateFilter)
    ])
    const invoices = ledger.issuedInvoices
    const expenses = ledger.expenses

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // ========== REVENUS / DÉPENSES ==========
    const s = summarizeCorporate(ledger, today)
    const {
      revenueBilled, revenueCollected, receivablesOpen, receivablesOverdue,
      expensesTotal, expensesPaid, payablesOpen, payablesOverdue, brsRetained, brsPending,
      creditNotesTotal, refundsPaid, refundsPending,
    } = s

    // ========== TRÉSORERIE ==========
    const treasuryBalance = revenueCollected - expensesPaid     // Flux de caisse net de la période
    const projectedBalance = treasuryBalance + receivablesOpen - payablesOpen - refundsPending
    const grossMargin = s.grossMargin                           // Base HT

    // ========== CASHFLOW MENSUEL ==========
    const cashflowMap = new Map<string, { period: string; revenue: number; expense: number; net: number }>()
    const ensure = (key: string) => {
      if (!cashflowMap.has(key)) cashflowMap.set(key, { period: key, revenue: 0, expense: 0, net: 0 })
      return cashflowMap.get(key)!
    }
    for (const inv of ledger.cashInvoices) {
      for (const entry of invoiceCashEntries(inv, dateFilter)) ensure(ymKey(entry.date)).revenue += entry.amount
    }
    for (const refund of refundsInRange(ledger)) {
      ensure(ymKey(new Date(refund.refundedAt))).revenue -= Number(refund.refundAmount || 0)
    }
    for (const exp of ledger.paidExpenses) {
      for (const entry of expenseCashEntries(exp, dateFilter)) ensure(ymKey(entry.date)).expense += entry.amount
    }
    const cashflow = Array.from(cashflowMap.values()).sort((a, b) => a.period.localeCompare(b.period))
    cashflow.forEach((c) => { c.net = c.revenue - c.expense })

    // ========== DÉPENSES PAR CATÉGORIE ==========
    const byCategoryMap = new Map<string, { category: string; total: number; paid: number; count: number }>()
    for (const exp of expenses) {
      const cat = exp.category || 'autre'
      const e = byCategoryMap.get(cat) || { category: cat, total: 0, paid: 0, count: 0 }
      e.total += Number(exp.amountTTC || 0)
      e.paid += Number(exp.paidAmount || 0)
      e.count += 1
      byCategoryMap.set(cat, e)
    }
    const expensesByCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.total - a.total)

    // ========== P&L PAR PROJET ==========
    const projectMap = new Map<string, {
      projectId: string
      projectName: string
      status?: string
      budget: number
      revenueBilled: number
      revenueBilledHT: number
      revenueCollected: number
      expensesTotal: number
      expensesHT: number
      expensesPaid: number
      margin: number
      marginPct: number
      invoicesCount: number
      expensesCount: number
    }>()

    for (const p of projects) {
      const id = String(p._id)
      projectMap.set(id, {
        projectId: id,
        projectName: p.name || 'Projet',
        status: p.status,
        budget: Number(p.value || 0),
        revenueBilled: 0,
        revenueBilledHT: 0,
        revenueCollected: 0,
        expensesTotal: 0,
        expensesHT: 0,
        expensesPaid: 0,
        margin: 0,
        marginPct: 0,
        invoicesCount: 0,
        expensesCount: 0
      })
    }

    for (const inv of invoices) {
      const e = inv.projectId ? projectMap.get(String(inv.projectId)) : undefined
      if (!e || !['sent', 'paid', 'overdue', 'partial'].includes(String(inv.status))) continue
      e.revenueBilled += Number(inv.total || 0)
      e.revenueBilledHT += Number(inv.subtotal || 0)
      e.invoicesCount += 1
    }
    for (const inv of ledger.cashInvoices) {
      const e = inv.projectId ? projectMap.get(String(inv.projectId)) : undefined
      if (e) e.revenueCollected += invoiceCashEntries(inv, dateFilter).reduce((sum, entry) => sum + entry.amount, 0)
    }
    for (const cn of ledger.creditNotes) {
      const e = cn.projectId ? projectMap.get(String(cn.projectId)) : undefined
      if (!e) continue
      e.revenueBilled -= Number(cn.total || 0)
      e.revenueBilledHT -= Number(cn.subtotal || cn.total || 0)
    }

    for (const exp of expenses) {
      const e = exp.projectId ? projectMap.get(String(exp.projectId)) : undefined
      if (!e) continue
      e.expensesTotal += Number(exp.amountTTC || 0)
      e.expensesHT += Number(exp.amountHT || 0)
      e.expensesCount += 1
    }
    for (const exp of ledger.paidExpenses) {
      const e = exp.projectId ? projectMap.get(String(exp.projectId)) : undefined
      if (e) e.expensesPaid += expenseCashEntries(exp, dateFilter).reduce((sum, entry) => sum + entry.amount, 0)
    }

    const projectsPL = Array.from(projectMap.values())
      .map((p) => {
        // Marge projet sur base HT (cohérente avec la marge globale)
        const margin = p.revenueBilledHT - p.expensesHT
        const marginPct = p.revenueBilledHT > 0 ? (margin / p.revenueBilledHT) * 100 : 0
        return { ...p, margin, marginPct }
      })
      .filter((p) => p.revenueBilled > 0 || p.expensesTotal > 0 || p.revenueCollected > 0 || p.expensesPaid > 0)
      .sort((a, b) => b.revenueBilled - a.revenueBilled)

    // ========== TOP DÉPENSES À PAYER (urgent, toutes périodes) ==========
    const topPayables = ledger.openExpenses
      .map((e: any) => ({
        id: String(e._id),
        numero: e.numero,
        label: e.label,
        supplier: e.supplier?.name,
        amountTTC: e.amountTTC,
        paidAmount: e.paidAmount,
        remaining: Math.max(0, Number(e.netPayable ?? e.amountTTC ?? 0) - Number(e.paidAmount || 0)),
        dueDate: e.dueDate,
        category: e.category,
        projectName: e.projectName
      }))
      .sort((a: any, b: any) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
        return da - db
      })
      .slice(0, 10)

    // ========== TOP CRÉANCES (factures à encaisser, toutes périodes) ==========
    const topReceivables = ledger.openInvoices
      .map((i: any) => ({
        id: String(i._id),
        numero: i.numero,
        clientName: i.client?.name || i.client?.company,
        total: invoiceBalance(i),
        dueDate: i.dueDate,
        status: i.status,
        isOverdue: (i.status === 'overdue') || (i.dueDate && new Date(i.dueDate) < today)
      }))
      .sort((a: any, b: any) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
        return da - db
      })
      .slice(0, 10)

    // ========== PIPELINE COMMERCIAL ==========
    // "Accepté" = accepté mais pas encore facturé (sinon double compte avec le facturé)
    const invoicedQuotes = new Set((invoicedQuoteIds as unknown[]).map(String))
    let pipelineDraft = 0, pipelineSent = 0, pipelineAccepted = 0
    for (const q of quotes) {
      const total = Number(q.total || 0)
      if (q.status === 'draft') pipelineDraft += total
      else if (q.status === 'sent') pipelineSent += total
      else if (q.status === 'accepted' && !invoicedQuotes.has(String(q._id))) pipelineAccepted += total
    }

    // ========== FINANCE PAR DOMAINE ==========
    // Blocs marketplace/xeuy calculés par la lib partagée (même source que le digest cron).

    // — Corporate : bloc existant (factures/dépenses/devis) —
    const corporate = {
      revenueBilled,
      revenueCollected,
      receivablesOpen,
      receivablesOverdue,
      expensesTotal,
      expensesPaid,
      payablesOpen,
      margin: grossMargin,
      marginPct: s.grossMarginPct,
      invoicesCount: invoices.length,
      expensesCount: expenses.length,
    }

    // — Consolidation globale —
    const global = consolidateGlobal(
      { revenueBilled, revenueCollected, receivablesOpen, expensesPaid },
      marketplace,
      xeuy
    )

    return NextResponse.json({
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      kpis: {
        revenueBilled,
        revenueCollected,
        receivablesOpen,
        receivablesOverdue,
        expensesTotal,
        expensesPaid,
        payablesOpen,
        payablesOverdue,
        treasuryBalance,
        projectedBalance,
        grossMargin,
        grossMarginPct: s.grossMarginPct,
        revenueBilledHT: s.revenueBilledHT,
        expensesHT: s.expensesHT,
        invoicesCount: invoices.length,
        expensesCount: expenses.length,
        brsRetained,
        brsPending,
        creditNotesTotal,
        refundsPaid,
        refundsPending
      },
      pipeline: {
        draft: pipelineDraft,
        sent: pipelineSent,
        accepted: pipelineAccepted
      },
      cashflow,
      expensesByCategory,
      projectsPL,
      topPayables,
      topReceivables,
      // Finance isolée par domaine + consolidation
      domains: { corporate, marketplace, xeuy },
      global,
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/treasury:', error)
    return NextResponse.json({ error: 'Erreur lors du calcul de la trésorerie' }, { status: 500 })
  }
}
