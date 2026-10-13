import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Payment from '@/lib/models/Payment'
import TopupPayment from '@/lib/models/TopupPayment'
import AdminInvoice from '@/lib/models/AdminInvoice'
import CreditNote from '@/lib/models/CreditNote'
import Expense from '@/lib/models/Expense'
import { invoiceBalance, OPEN_INVOICE_STATUSES } from '@/lib/finance/billing'

/**
 * Finance isolée par domaine — source unique de vérité des agrégats.
 * Utilisée par /api/admin/treasury (dashboard) et /api/cron/finance-digest (email hebdo).
 * Le `global` est consolidé à partir de ces blocs — ne jamais re-interroger
 * les modèles en dehors de ces fonctions pour la compta par domaine.
 */

export interface MarketplaceFinance {
  ordersCount: number
  groupsWithPayments: number
  revenueCollected: number
  revenuePending: number
  serviceFees: number
  insuranceFees: number
  shippingCollected: number
  discountsGranted: number
}

export interface XeuyFinance {
  paymentsHeld: number
  paymentsReleased: number
  paymentsPending: number
  paymentsRefunded: number
  paymentsFailed: number
  topupsCollected: number
  topupsPending: number
  totalCollected: number
}

export interface CorporateFinance {
  revenueBilled: number
  revenueCollected: number
  receivablesOpen: number
  expensesPaid: number
}

export interface GlobalFinance {
  revenueCollected: number
  revenuePending: number
  expensesPaid: number
  treasuryBalance: number
}

type DateRange = { $gte: Date; $lte: Date }

/** Marketplace (DDM+) : commandes standard payées + achats groupés (participants payés).
 *  Les `Payment` domain marketplace/group ne sont PAS comptés — couche technique de
 *  suivi ; le ledger financier reste Order/GroupOrder (évite le double comptage). */
export async function computeMarketplaceFinance(createdAt: DateRange): Promise<MarketplaceFinance> {
  const [marketOrders, groupOrders] = await Promise.all([
    // Les commandes legacy sans `domain` sont marketplace par défaut (défaut du schéma)
    Order.find({ createdAt, $or: [{ domain: 'marketplace' }, { domain: { $exists: false } }, { domain: null }] })
      .select('orderId total paymentStatus status fees.serviceFeeAmount fees.insuranceAmount shipping.cost promoDiscount grainsDiscount createdAt')
      .lean() as any,
    GroupOrder.find({ createdAt })
      .select('groupId status participants.paymentStatus participants.paidAmount participants.totalAmount')
      .lean() as any,
  ])

  let ordersCount = 0, revenueCollected = 0, revenuePending = 0
  let serviceFees = 0, insuranceFees = 0, shippingCollected = 0, discountsGranted = 0
  for (const o of marketOrders as any[]) {
    if (o.status === 'cancelled') continue
    ordersCount += 1
    const total = Number(o.total || 0)
    if (o.paymentStatus === 'completed') {
      revenueCollected += total
      serviceFees += Number(o.fees?.serviceFeeAmount || 0)
      insuranceFees += Number(o.fees?.insuranceAmount || 0)
      shippingCollected += Number(o.shipping?.cost || 0)
      discountsGranted += Number(o.promoDiscount || 0) + Number(o.grainsDiscount || 0)
    } else if (o.paymentStatus !== 'failed' && o.paymentStatus !== 'refunded') {
      revenuePending += total
    }
  }

  let groupCollected = 0, groupPending = 0, groupsWithPayments = 0
  for (const g of groupOrders as any[]) {
    let paid = false
    for (const p of (g.participants || [])) {
      if (p.paymentStatus === 'paid') {
        groupCollected += Number(p.paidAmount || p.totalAmount || 0)
        paid = true
      } else if (p.paymentStatus === 'pending') {
        groupPending += Number(p.totalAmount || 0)
      }
    }
    if (paid) groupsWithPayments += 1
  }

  return {
    ordersCount,
    groupsWithPayments,
    revenueCollected: revenueCollected + groupCollected,
    revenuePending: revenuePending + groupPending,
    serviceFees,
    insuranceFees,
    shippingCollected,
    discountsGranted,
  }
}

/** Xeuy (services) : paiements de missions par statut + recharges wallet encaissées.
 *  Les points XC sont une monnaie interne — seuls les FCFA entrent dans le CA. */
export async function computeXeuyFinance(createdAt: DateRange): Promise<XeuyFinance> {
  const [servicePayments, topups] = await Promise.all([
    // Les paiements legacy sans `domain` sont des missions services (défaut du schéma)
    Payment.find({ createdAt, $or: [{ domain: 'services' }, { domain: { $exists: false } }, { domain: null }] })
      .select('amount status provider phase manualConfirm createdAt')
      .lean() as any,
    TopupPayment.find({ createdAt })
      .select('amountFcfa points bonusCredits status createdAt')
      .lean() as any,
  ])

  let held = 0, released = 0, pending = 0, refunded = 0, failed = 0
  for (const p of servicePayments as any[]) {
    const amt = Number(p.amount || 0)
    if (p.status === 'held') held += amt
    else if (p.status === 'released') released += amt
    else if (p.status === 'refunded') refunded += amt
    else if (p.status === 'failed') failed += amt
    else pending += amt
  }

  let topupsCollected = 0, topupsPending = 0
  for (const t of topups as any[]) {
    if (t.status === 'successful') topupsCollected += Number(t.amountFcfa || 0)
    else if (t.status === 'pending') topupsPending += Number(t.amountFcfa || 0)
  }

  return {
    paymentsHeld: held,
    paymentsReleased: released,
    paymentsPending: pending,
    paymentsRefunded: refunded,
    paymentsFailed: failed,
    topupsCollected,
    topupsPending,
    totalCollected: held + released + topupsCollected,
  }
}

/**
 * Corporate (IT Vision B2B) — factures, avoirs et dépenses.
 * - Facturé : factures émises dans la période moins les avoirs émis dans la période.
 * - Encaissé : paiements (acomptes, soldes) datés dans la période, moins les remboursements
 *   d'avoirs faits dans la période ; les anciennes factures sans paiements détaillés comptent
 *   pour leur total à la date de paiement.
 * - Créances / dettes ouvertes : photo à date (toutes périodes confondues), reste dû.
 * - Décaissé : dépenses dont le paiement (paidAt) tombe dans la période.
 */
export async function loadCorporateLedger(range: DateRange) {
  const invoiceFields = {
    numero: 1, date: 1, dueDate: 1, status: 1, total: 1, subtotal: 1, taxAmount: 1, brsAmount: 1,
    paymentDate: 1, paidAt: 1, payments: 1, amountPaid: 1, creditedAmount: 1,
    projectId: 1, quoteId: 1, clientCompanyId: 1, client: 1,
  }
  // paymentDate est stockée en texte AAAA-MM-JJ : comparaison lexicographique
  const dayRange = { $gte: range.$gte.toISOString().slice(0, 10), $lte: range.$lte.toISOString().slice(0, 10) }
  const legacyPaid = { status: 'paid', 'payments.0': { $exists: false } }
  const [issuedInvoices, cashInvoices, openInvoices, creditNotes, refunds, expenses, paidExpenses, openExpenses] = await Promise.all([
    AdminInvoice.find({ date: range }).select(invoiceFields).lean() as any,
    AdminInvoice.find({
      $or: [
        { 'payments.date': range },
        { ...legacyPaid, paymentDate: dayRange },
        { ...legacyPaid, paymentDate: null, paidAt: range },
        { ...legacyPaid, paymentDate: null, paidAt: null, date: range },
      ],
    }).select(invoiceFields).lean() as any,
    AdminInvoice.find({ status: { $in: OPEN_INVOICE_STATUSES } }).select(invoiceFields).lean() as any,
    CreditNote.find({ date: range }).select('numero date total subtotal projectId invoiceId').lean() as any,
    CreditNote.find({ refundStatus: { $in: ['pending', 'refunded'] } }).select('numero refundAmount refundStatus refundedAt projectId').lean() as any,
    Expense.find({ expenseDate: range, paymentStatus: { $ne: 'cancelled' } }).lean() as any,
    Expense.find({
      paymentStatus: { $ne: 'cancelled' },
      $or: [
        { 'payments.date': range },
        { 'payments.0': { $exists: false }, paidAmount: { $gt: 0 }, paidAt: range },
        { 'payments.0': { $exists: false }, paidAmount: { $gt: 0 }, paidAt: null, expenseDate: range },
      ],
    }).lean() as any,
    Expense.find({ paymentStatus: { $in: ['unpaid', 'partial'] } }).lean() as any,
  ])
  return { range, issuedInvoices, cashInvoices, openInvoices, creditNotes, refunds, expenses, paidExpenses, openExpenses } as {
    range: DateRange
    issuedInvoices: any[]; cashInvoices: any[]; openInvoices: any[]; creditNotes: any[]; refunds: any[]
    expenses: any[]; paidExpenses: any[]; openExpenses: any[]
  }
}

export type CorporateLedger = Awaited<ReturnType<typeof loadCorporateLedger>>

const BILLED_STATUSES = ['sent', 'partial', 'paid', 'overdue']

const inRange = (d: Date, range: DateRange) => d.getTime() >= range.$gte.getTime() && d.getTime() <= range.$lte.getTime()

/** Encaissements d'une facture tombant dans la période (paiements détaillés, sinon total à la date de paiement). */
export function invoiceCashEntries(inv: any, range: DateRange): Array<{ date: Date; amount: number }> {
  if (Array.isArray(inv.payments) && inv.payments.length > 0) {
    return inv.payments
      .map((p: any) => ({ date: new Date(p.date), amount: Number(p.amount) || 0 }))
      .filter((p: { date: Date }) => !isNaN(p.date.getTime()) && inRange(p.date, range))
  }
  if (inv.status !== 'paid') return []
  const date = new Date(inv.paymentDate || inv.paidAt || inv.date)
  return isNaN(date.getTime()) || !inRange(date, range) ? [] : [{ date, amount: Number(inv.total) || 0 }]
}

/** Décaissements d'une dépense tombant dans la période (historique des paiements, sinon montant payé à sa date). */
export function expenseCashEntries(exp: any, range: DateRange): Array<{ date: Date; amount: number }> {
  if (Array.isArray(exp.payments) && exp.payments.length > 0) {
    return exp.payments
      .map((p: any) => ({ date: new Date(p.date), amount: Number(p.amount) || 0 }))
      .filter((p: { date: Date }) => !isNaN(p.date.getTime()) && inRange(p.date, range))
  }
  const amount = Number(exp.paidAmount) || 0
  const date = new Date(exp.paidAt || exp.expenseDate)
  return amount <= 0 || isNaN(date.getTime()) || !inRange(date, range) ? [] : [{ date, amount }]
}

/** Remboursements d'avoirs effectués dans la période. */
export function refundsInRange(ledger: CorporateLedger) {
  return ledger.refunds.filter(r => r.refundStatus === 'refunded' && r.refundedAt && inRange(new Date(r.refundedAt), ledger.range))
}

export function summarizeCorporate(ledger: CorporateLedger, now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const n = (v: unknown) => Number(v) || 0

  let revenueBilled = 0, revenueBilledHT = 0
  for (const inv of ledger.issuedInvoices) {
    if (!BILLED_STATUSES.includes(String(inv.status)) && !(inv.status === 'cancelled' && n(inv.creditedAmount) > 0)) continue
    revenueBilled += n(inv.total)
    revenueBilledHT += n(inv.subtotal)
  }
  // Une facture annulée par avoir reste émise : le facturé net vient de la déduction de l'avoir
  const creditNotesTotal = ledger.creditNotes.reduce((s, c) => s + n(c.total), 0)
  const creditNotesHT = ledger.creditNotes.reduce((s, c) => s + n(c.subtotal || c.total), 0)
  revenueBilled -= creditNotesTotal
  revenueBilledHT -= creditNotesHT

  const refundsPaid = refundsInRange(ledger).reduce((s, r) => s + n(r.refundAmount), 0)
  const refundsPending = ledger.refunds.filter(r => r.refundStatus === 'pending').reduce((s, r) => s + n(r.refundAmount), 0)
  const cashIn = ledger.cashInvoices.reduce((s, inv) => s + invoiceCashEntries(inv, ledger.range).reduce((a, e) => a + e.amount, 0), 0)
  const revenueCollected = cashIn - refundsPaid

  let receivablesOpen = 0, receivablesOverdue = 0
  for (const inv of ledger.openInvoices) {
    const due = invoiceBalance(inv)
    receivablesOpen += due
    if (inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < today)) receivablesOverdue += due
  }

  let expensesTotal = 0, expensesHT = 0, brsRetained = 0
  for (const exp of ledger.expenses) {
    expensesTotal += n(exp.amountTTC)
    expensesHT += n(exp.amountHT)
    brsRetained += n(exp.brsAmount)
  }
  const expensesPaid = ledger.paidExpenses.reduce((s, exp) => s + expenseCashEntries(exp, ledger.range).reduce((a, e) => a + e.amount, 0), 0)

  let payablesOpen = 0, payablesOverdue = 0, brsPending = 0
  for (const exp of ledger.openExpenses) {
    const remaining = Math.max(0, n(exp.netPayable ?? exp.amountTTC) - n(exp.paidAmount))
    payablesOpen += remaining
    brsPending += n(exp.brsAmount)
    if (exp.dueDate && new Date(exp.dueDate) < today) payablesOverdue += remaining
  }

  // Marge sur base HT : la TVA collectée/déductible n'est ni un produit ni une charge
  const grossMargin = revenueBilledHT - expensesHT

  return {
    revenueBilled,
    revenueBilledHT,
    revenueCollected,
    receivablesOpen,
    receivablesOverdue,
    creditNotesTotal,
    refundsPaid,
    refundsPending,
    expensesTotal,
    expensesHT,
    expensesPaid,
    payablesOpen,
    payablesOverdue,
    brsRetained,
    brsPending,
    grossMargin,
    grossMarginPct: revenueBilledHT > 0 ? (grossMargin / revenueBilledHT) * 100 : 0,
  }
}

export async function computeCorporateFinance(range: DateRange): Promise<CorporateFinance> {
  const s = summarizeCorporate(await loadCorporateLedger(range))
  return {
    revenueBilled: s.revenueBilled,
    revenueCollected: s.revenueCollected,
    receivablesOpen: s.receivablesOpen,
    expensesPaid: s.expensesPaid,
  }
}

/** Consolidation globale — somme des blocs domaine, sans re-lecture des modèles. */
export function consolidateGlobal(
  corporate: CorporateFinance,
  marketplace: MarketplaceFinance,
  xeuy: XeuyFinance
): GlobalFinance {
  return {
    revenueCollected: corporate.revenueCollected + marketplace.revenueCollected + xeuy.totalCollected,
    revenuePending: corporate.receivablesOpen + marketplace.revenuePending + xeuy.paymentsPending + xeuy.topupsPending,
    expensesPaid: corporate.expensesPaid,
    treasuryBalance: corporate.revenueCollected - corporate.expensesPaid + marketplace.revenueCollected + xeuy.totalCollected,
  }
}
