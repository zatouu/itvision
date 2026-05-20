import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import AdminQuote from '@/lib/models/AdminQuote'
import Expense from '@/lib/models/Expense'
import Project from '@/lib/models/Project'

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

    const [invoices, expenses, quotes, projects] = await Promise.all([
      AdminInvoice.find({ date: dateFilter }).select({
        numero: 1, date: 1, dueDate: 1, status: 1, total: 1, subtotal: 1, taxAmount: 1,
        paymentDate: 1, paidAt: 1, projectId: 1, clientCompanyId: 1, client: 1
      }).lean() as any,
      Expense.find({ expenseDate: dateFilter }).lean() as any,
      AdminQuote.find({ date: dateFilter }).select({
        numero: 1, date: 1, status: 1, total: 1, projectId: 1, clientCompanyId: 1
      }).lean() as any,
      Project.find().select({ name: 1, status: 1, value: 1, clientId: 1, clientCompanyId: 1 }).lean() as any
    ])

    // ========== REVENUS ==========
    let revenueBilled = 0       // Total facturé (sent + paid + overdue)
    let revenueCollected = 0    // Encaissé (paid)
    let receivablesOpen = 0     // Créances ouvertes (sent + overdue)
    let receivablesOverdue = 0  // En retard

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const inv of invoices) {
      const total = Number(inv.total || 0)
      const status = String(inv.status || 'draft')
      if (['sent', 'paid', 'overdue'].includes(status)) revenueBilled += total
      if (status === 'paid') revenueCollected += total
      if (status === 'sent' || status === 'overdue') {
        receivablesOpen += total
        const due = inv.dueDate ? new Date(inv.dueDate) : null
        if (status === 'overdue' || (due && due < today)) receivablesOverdue += total
      }
    }

    // ========== DÉPENSES ==========
    let expensesTotal = 0       // Toutes dépenses TTC
    let expensesPaid = 0        // Décaissé
    let payablesOpen = 0        // À payer (unpaid + partial)
    let payablesOverdue = 0

    for (const exp of expenses) {
      const ttc = Number(exp.amountTTC || 0)
      const paid = Number(exp.paidAmount || 0)
      if (exp.paymentStatus === 'cancelled') continue
      expensesTotal += ttc
      expensesPaid += paid
      const remaining = Math.max(0, ttc - paid)
      if (exp.paymentStatus !== 'paid') {
        payablesOpen += remaining
        const due = exp.dueDate ? new Date(exp.dueDate) : null
        if (due && due < today) payablesOverdue += remaining
      }
    }

    // ========== TRÉSORERIE ==========
    const treasuryBalance = revenueCollected - expensesPaid     // Cash réel
    const projectedBalance = treasuryBalance + receivablesOpen - payablesOpen
    const grossMargin = revenueBilled - expensesTotal

    // ========== CASHFLOW MENSUEL ==========
    const cashflowMap = new Map<string, { period: string; revenue: number; expense: number; net: number }>()
    const ensure = (key: string) => {
      if (!cashflowMap.has(key)) cashflowMap.set(key, { period: key, revenue: 0, expense: 0, net: 0 })
      return cashflowMap.get(key)!
    }
    for (const inv of invoices) {
      if (inv.status !== 'paid') continue
      const date = inv.paymentDate ? new Date(inv.paymentDate) : (inv.paidAt ? new Date(inv.paidAt) : new Date(inv.date))
      if (isNaN(date.getTime())) continue
      ensure(ymKey(date)).revenue += Number(inv.total || 0)
    }
    for (const exp of expenses) {
      if (exp.paymentStatus === 'cancelled') continue
      const date = exp.paidAt ? new Date(exp.paidAt) : new Date(exp.expenseDate)
      if (isNaN(date.getTime())) continue
      ensure(ymKey(date)).expense += Number(exp.paidAmount || 0)
    }
    const cashflow = Array.from(cashflowMap.values()).sort((a, b) => a.period.localeCompare(b.period))
    cashflow.forEach((c) => { c.net = c.revenue - c.expense })

    // ========== DÉPENSES PAR CATÉGORIE ==========
    const byCategoryMap = new Map<string, { category: string; total: number; paid: number; count: number }>()
    for (const exp of expenses) {
      if (exp.paymentStatus === 'cancelled') continue
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
      revenueCollected: number
      expensesTotal: number
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
        revenueCollected: 0,
        expensesTotal: 0,
        expensesPaid: 0,
        margin: 0,
        marginPct: 0,
        invoicesCount: 0,
        expensesCount: 0
      })
    }

    for (const inv of invoices) {
      if (!inv.projectId) continue
      const id = String(inv.projectId)
      const e = projectMap.get(id)
      if (!e) continue
      const total = Number(inv.total || 0)
      const status = String(inv.status || 'draft')
      if (['sent', 'paid', 'overdue'].includes(status)) {
        e.revenueBilled += total
        e.invoicesCount += 1
      }
      if (status === 'paid') e.revenueCollected += total
    }

    for (const exp of expenses) {
      if (!exp.projectId || exp.paymentStatus === 'cancelled') continue
      const id = String(exp.projectId)
      const e = projectMap.get(id)
      if (!e) continue
      e.expensesTotal += Number(exp.amountTTC || 0)
      e.expensesPaid += Number(exp.paidAmount || 0)
      e.expensesCount += 1
    }

    const projectsPL = Array.from(projectMap.values())
      .map((p) => {
        const margin = p.revenueBilled - p.expensesTotal
        const marginPct = p.revenueBilled > 0 ? (margin / p.revenueBilled) * 100 : 0
        return { ...p, margin, marginPct }
      })
      .filter((p) => p.revenueBilled > 0 || p.expensesTotal > 0)
      .sort((a, b) => b.revenueBilled - a.revenueBilled)

    // ========== TOP DÉPENSES À PAYER (urgent) ==========
    const topPayables = expenses
      .filter((e: any) => e.paymentStatus !== 'paid' && e.paymentStatus !== 'cancelled')
      .map((e: any) => ({
        id: String(e._id),
        numero: e.numero,
        label: e.label,
        supplier: e.supplier?.name,
        amountTTC: e.amountTTC,
        paidAmount: e.paidAmount,
        remaining: Math.max(0, Number(e.amountTTC || 0) - Number(e.paidAmount || 0)),
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

    // ========== TOP CRÉANCES (factures à encaisser) ==========
    const topReceivables = invoices
      .filter((i: any) => ['sent', 'overdue'].includes(String(i.status)))
      .map((i: any) => ({
        id: String(i._id),
        numero: i.numero,
        clientName: i.client?.name || i.client?.company,
        total: i.total,
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
    let pipelineDraft = 0, pipelineSent = 0, pipelineAccepted = 0
    for (const q of quotes) {
      const total = Number(q.total || 0)
      if (q.status === 'draft') pipelineDraft += total
      else if (q.status === 'sent') pipelineSent += total
      else if (q.status === 'accepted') pipelineAccepted += total
    }

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
        grossMarginPct: revenueBilled > 0 ? (grossMargin / revenueBilled) * 100 : 0,
        invoicesCount: invoices.length,
        expensesCount: expenses.length
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
      topReceivables
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/treasury:', error)
    return NextResponse.json({ error: 'Erreur lors du calcul de la trésorerie' }, { status: 500 })
  }
}
