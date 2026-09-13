import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { computeMarketplaceFinance, computeXeuyFinance, consolidateGlobal } from '@/lib/finance/domain-finance'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Expense from '@/lib/models/Expense'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND } from '@/lib/branding'

function requireCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret') || ''
  const expected = process.env.CRON_SECRET || ''
  if (!expected) {
    console.warn('[CRON DIGEST] CRON_SECRET non configuré — appel refusé')
    return false
  }
  return secret === expected
}

const fmt = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`

/** Corporate finance pour une période — mêmes sémantiques que /api/admin/treasury. */
async function computeCorporateFinance(dateFilter: { $gte: Date; $lte: Date }) {
  const [invoices, expenses] = await Promise.all([
    AdminInvoice.find({ date: dateFilter }).select('status total dueDate').lean() as any,
    Expense.find({ expenseDate: dateFilter }).select('paymentStatus amountTTC paidAmount').lean() as any,
  ])
  let revenueBilled = 0, revenueCollected = 0, receivablesOpen = 0, expensesPaid = 0
  for (const inv of invoices as any[]) {
    const total = Number(inv.total || 0)
    const status = String(inv.status || 'draft')
    if (['sent', 'paid', 'overdue'].includes(status)) revenueBilled += total
    if (status === 'paid') revenueCollected += total
    if (status === 'sent' || status === 'overdue') receivablesOpen += total
  }
  for (const e of expenses as any[]) {
    if (e.paymentStatus === 'cancelled') continue
    expensesPaid += Number(e.paidAmount || 0)
  }
  return { revenueBilled, revenueCollected, receivablesOpen, expensesPaid }
}

function section(title: string, rows: Array<[string, number | string]>) {
  return `<h3 style="margin:16px 0 6px;font-size:14px;color:#444">${title}</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      ${rows.map(([l, v]) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;color:#666">${l}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${v}</td></tr>`).join('')}
    </table>`
}

/**
 * GET /api/cron/finance-digest
 * Rapport finance hebdomadaire par domaine (7 derniers jours) + global consolidé.
 * Envoie un email récap à l'admin. Retourne le rapport en JSON.
 */
export async function GET(request: NextRequest) {
  if (!requireCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  }

  try {
    await connectMongoose()

    const now = new Date()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const dateFilter = { $gte: weekStart, $lte: now }

    const [corporate, marketplace, xeuy] = await Promise.all([
      computeCorporateFinance(dateFilter),
      computeMarketplaceFinance(dateFilter),
      computeXeuyFinance(dateFilter),
    ])
    const global = consolidateGlobal(corporate, marketplace, xeuy)

    const period = `${weekStart.toLocaleDateString('fr-FR')} → ${now.toLocaleDateString('fr-FR')}`
    const report = { period, corporate, marketplace, xeuy, global }

    const adminEmail = process.env.ADMIN_EMAIL || CORPORATE_BRAND.contactEmail
    await emailService.sendEmail({
      to: adminEmail,
      subject: `[Finance hebdo] ${period} — Encaissé global ${fmt(global.revenueCollected)}`,
      html: `<h2 style="font-size:18px;margin:0 0 4px">Rapport finance hebdomadaire</h2>
        <p style="color:#777;font-size:12px;margin:0 0 8px">Période : ${period}</p>
        ${section('Global consolidé', [
          ['Revenus encaissés', fmt(global.revenueCollected)],
          ['Revenus en attente', fmt(global.revenuePending)],
          ['Dépenses payées', fmt(global.expensesPaid)],
          ['Solde trésorerie', fmt(global.treasuryBalance)],
        ])}
        ${section('Corporate', [
          ['Encaissé', fmt(corporate.revenueCollected)],
          ['Facturé', fmt(corporate.revenueBilled)],
          ['Créances ouvertes', fmt(corporate.receivablesOpen)],
        ])}
        ${section('Marketplace DDM+', [
          ['Encaissé', fmt(marketplace.revenueCollected)],
          ['En attente', fmt(marketplace.revenuePending)],
          ['Commandes', marketplace.ordersCount],
          ['Groupes avec paiements', marketplace.groupsWithPayments],
          ['Frais de service', fmt(marketplace.serviceFees)],
          ['Assurance', fmt(marketplace.insuranceFees)],
        ])}
        ${section('Xeuy Services', [
          ['Encaissé total', fmt(xeuy.totalCollected)],
          ['En séquestre', fmt(xeuy.paymentsHeld)],
          ['Reversé prestataires', fmt(xeuy.paymentsReleased)],
          ['Recharges wallet', fmt(xeuy.topupsCollected)],
          ['En attente', fmt(xeuy.paymentsPending + xeuy.topupsPending)],
        ])}`,
      brand: CORPORATE_BRAND,
    })

    return NextResponse.json({ success: true, ...report })
  } catch (error: any) {
    console.error('[CRON DIGEST] Erreur:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
