import AdminInvoice from '@/lib/models/AdminInvoice'
import CreditNote from '@/lib/models/CreditNote'
import Expense from '@/lib/models/Expense'
import { LABOR_INVOICE_CATEGORY } from '@/lib/finance/billing'

/**
 * Journaux comptables (ventes, achats, banque) au format d'import CSV générique
 * (Journal ; Date ; Pièce ; Compte ; Tiers ; Libellé ; Débit ; Crédit), plan SYSCOHADA.
 * Les comptes ci-dessous sont des valeurs par défaut à valider avec l'expert-comptable.
 */

export const ACCOUNTS = {
  clients: '411',
  suppliers: '401',
  salesServices: '706',
  salesGoods: '701',
  vatCollected: '4431',
  vatDeductible: '4452',
  brsSuffered: '4449', // BRS retenue par nos clients
  brsWithheld: '447', // BRS retenue sur nos fournisseurs, à reverser
  bank: '521',
  cash: '571',
}

export const EXPENSE_ACCOUNTS: Record<string, string> = {
  achat_materiel: '601',
  sous_traitance: '621',
  transport: '618',
  salaire: '661',
  loyer: '622',
  services: '632',
  taxes: '641',
  commissions: '631',
  marketing: '627',
  logistique: '618',
  douane: '601',
  autre: '638',
}

export type JournalCode = 'VT' | 'AC' | 'BQ'
export const JOURNALS: Record<JournalCode, string> = { VT: 'Ventes', AC: 'Achats', BQ: 'Banque / caisse' }

export interface JournalLine {
  journal: JournalCode
  date: string
  piece: string
  account: string
  thirdParty?: string
  label: string
  debit: number
  credit: number
}

const money = (n: unknown) => Math.round(Number(n) || 0)
const day = (d: unknown) => new Date(d as any).toISOString().slice(0, 10)
const inRange = (d: unknown, start: Date, end: Date) => {
  const t = new Date(d as any).getTime()
  return !isNaN(t) && t >= start.getTime() && t <= end.getTime()
}
const treasuryAccount = (method?: string) => /esp[eè]ce|cash|caisse/i.test(method || '') ? ACCOUNTS.cash : ACCOUNTS.bank

/** Écriture équilibrée : les lignes à zéro sont omises, un montant négatif change de sens. */
function entry(base: Omit<JournalLine, 'account' | 'debit' | 'credit' | 'thirdParty'>, parts: Array<[string, number, number, string?]>): JournalLine[] {
  return parts
    .map(([account, debit, credit, thirdParty]) => {
      const net = money(debit) - money(credit)
      return { ...base, account, thirdParty, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 }
    })
    .filter(l => l.debit !== 0 || l.credit !== 0)
}

/** Ventilation du chiffre d'affaires (hors taxes, avant BRS) entre prestations et marchandises. */
function revenueSplit(items: any[], revenue: number): Array<[string, number]> {
  const services = (items || []).filter(i => i.category === LABOR_INVOICE_CATEGORY).reduce((s, i) => s + money(i.totalPrice), 0)
  const goods = (items || []).filter(i => i.category !== LABOR_INVOICE_CATEGORY).reduce((s, i) => s + money(i.totalPrice), 0)
  if (services + goods !== revenue || goods === 0) return [[ACCOUNTS.salesServices, revenue]]
  return [[ACCOUNTS.salesServices, services], [ACCOUNTS.salesGoods, goods]]
}

export async function buildJournals(start: Date, end: Date, journals: JournalCode[]) {
  const lines: JournalLine[] = []
  const want = (j: JournalCode) => journals.includes(j)

  if (want('VT')) {
    const invoices = await AdminInvoice.find({ status: { $in: ['sent', 'partial', 'paid', 'overdue'] }, date: { $gte: start, $lte: end } })
      .select('numero date client items subtotal taxAmount brsAmount total').sort({ date: 1, numero: 1 }).lean() as any[]
    for (const inv of invoices) {
      const client = inv.client?.company || inv.client?.name || ''
      const tax = money(inv.taxAmount)
      const brs = money(inv.brsAmount)
      const revenue = money(inv.total) + brs - tax
      lines.push(...entry({ journal: 'VT', date: day(inv.date), piece: inv.numero, label: `Facture ${inv.numero} ${client}`.trim() }, [
        [ACCOUNTS.clients, money(inv.total), 0, client],
        [ACCOUNTS.brsSuffered, brs, 0],
        ...revenueSplit(inv.items, revenue).map(([acc, amt]) => [acc, 0, amt] as [string, number, number]),
        [ACCOUNTS.vatCollected, 0, tax],
      ]))
    }

    const notes = await CreditNote.find({ date: { $gte: start, $lte: end } })
      .select('numero invoiceNumero date client taxAmount brsAmount total').sort({ date: 1, numero: 1 }).lean() as any[]
    for (const cn of notes) {
      const client = cn.client?.company || cn.client?.name || ''
      const tax = money(cn.taxAmount)
      const brs = money(cn.brsAmount)
      lines.push(...entry({ journal: 'VT', date: day(cn.date), piece: cn.numero, label: `Avoir ${cn.numero} sur ${cn.invoiceNumero} ${client}`.trim() }, [
        [ACCOUNTS.clients, 0, money(cn.total), client],
        [ACCOUNTS.brsSuffered, 0, brs],
        [ACCOUNTS.salesServices, money(cn.total) + brs - tax, 0],
        [ACCOUNTS.vatCollected, tax, 0],
      ]))
    }
  }

  if (want('AC')) {
    const expenses = await Expense.find({ paymentStatus: { $ne: 'cancelled' }, expenseDate: { $gte: start, $lte: end } })
      .select('numero label category supplier expenseDate amountHT taxAmount brsAmount').sort({ expenseDate: 1, numero: 1 }).lean() as any[]
    for (const ex of expenses) {
      const supplier = ex.supplier?.name || ''
      const ht = money(ex.amountHT)
      const tax = money(ex.taxAmount)
      const brs = money(ex.brsAmount)
      lines.push(...entry({ journal: 'AC', date: day(ex.expenseDate), piece: ex.numero, label: `${ex.label}${supplier ? ` - ${supplier}` : ''}`.slice(0, 120) }, [
        [EXPENSE_ACCOUNTS[ex.category] || EXPENSE_ACCOUNTS.autre, ht, 0],
        [ACCOUNTS.vatDeductible, tax, 0],
        [ACCOUNTS.suppliers, 0, ht + tax - brs, supplier],
        [ACCOUNTS.brsWithheld, 0, brs],
      ]))
    }
  }

  if (want('BQ')) {
    const paidInvoices = await AdminInvoice.find({ 'payments.date': { $gte: start, $lte: end } })
      .select('numero client payments').lean() as any[]
    const notes = await CreditNote.find({ refundStatus: 'refunded', refundedAt: { $gte: start, $lte: end } })
      .select('numero client refundAmount refundedAt refundMethod').lean() as any[]
    const expenses = await Expense.find({ 'payments.date': { $gte: start, $lte: end } })
      .select('numero label supplier payments').lean() as any[]

    const bank: JournalLine[] = []
    for (const inv of paidInvoices) {
      const client = inv.client?.company || inv.client?.name || ''
      for (const p of inv.payments || []) {
        if (!inRange(p.date, start, end)) continue
        bank.push(...entry({ journal: 'BQ', date: day(p.date), piece: inv.numero, label: `Règlement ${inv.numero} ${client}${p.reference ? ` (${p.reference})` : ''}`.slice(0, 120) }, [
          [treasuryAccount(p.method), money(p.amount), 0],
          [ACCOUNTS.clients, 0, money(p.amount), client],
        ]))
      }
    }
    for (const cn of notes) {
      const client = cn.client?.company || cn.client?.name || ''
      bank.push(...entry({ journal: 'BQ', date: day(cn.refundedAt), piece: cn.numero, label: `Remboursement avoir ${cn.numero} ${client}`.trim() }, [
        [ACCOUNTS.clients, money(cn.refundAmount), 0, client],
        [treasuryAccount(cn.refundMethod), 0, money(cn.refundAmount)],
      ]))
    }
    for (const ex of expenses) {
      const supplier = ex.supplier?.name || ''
      for (const p of ex.payments || []) {
        if (!inRange(p.date, start, end)) continue
        bank.push(...entry({ journal: 'BQ', date: day(p.date), piece: ex.numero, label: `Paiement ${ex.numero} ${ex.label}`.slice(0, 120) }, [
          [ACCOUNTS.suppliers, money(p.amount), 0, supplier],
          [treasuryAccount(p.method), 0, money(p.amount)],
        ]))
      }
    }
    bank.sort((a, b) => a.date.localeCompare(b.date) || a.piece.localeCompare(b.piece))
    lines.push(...bank)
  }

  return lines
}

export function summarizeJournals(lines: JournalLine[]) {
  return (Object.keys(JOURNALS) as JournalCode[]).map(code => {
    const own = lines.filter(l => l.journal === code)
    return {
      code,
      name: JOURNALS[code],
      entries: new Set(own.map(l => `${l.date}|${l.piece}`)).size,
      lines: own.length,
      debit: own.reduce((s, l) => s + l.debit, 0),
      credit: own.reduce((s, l) => s + l.credit, 0),
    }
  })
}

// Neutralise les formules (injection CSV) et protège les séparateurs
function csvCell(v: string | number) {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function journalsToCsv(lines: JournalLine[]) {
  const header = ['Journal', 'Date', 'Piece', 'Compte', 'Tiers', 'Libelle', 'Debit', 'Credit']
  const rows = lines.map(l => [
    l.journal,
    l.date.split('-').reverse().join('/'),
    l.piece,
    l.account,
    l.thirdParty || '',
    l.label,
    l.debit || '',
    l.credit || '',
  ].map(csvCell).join(';'))
  return '\uFEFF' + [header.join(';'), ...rows].join('\r\n') + '\r\n'
}
