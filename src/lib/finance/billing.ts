import type { Model } from 'mongoose'
import DocumentCounter from '@/lib/models/DocumentCounter'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import CreditNote from '@/lib/models/CreditNote'
import Project from '@/lib/models/Project'

/**
 * Règles métier de la facturation B2B (devis, factures) — source unique pour l'API admin,
 * les générations automatiques et la conversion devis → facture.
 */

// ─── Numérotation atomique ────────────────────────────────────────────────────

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function maxExistingNumber(model: Model<any>, prefix: string): Promise<number> {
  const docs = await model.find({ numero: new RegExp(`^${escapeRegex(prefix)}\\d+$`) }).select('numero').lean() as any[]
  return docs.reduce((max, d) => Math.max(max, Number(String(d.numero).slice(prefix.length)) || 0), 0)
}

async function nextNumber(model: Model<any>, prefix: string, pad: number): Promise<string> {
  let counter = await DocumentCounter.findOneAndUpdate({ _id: prefix }, { $inc: { seq: 1 } }, { new: true, upsert: true })
  if (counter!.seq === 1) {
    // Premier numéro de la série : se caler après les documents créés avant ce compteur
    const existing = await maxExistingNumber(model, prefix)
    if (existing >= 1) {
      const adjustedCounter = await DocumentCounter.findOneAndUpdate({ _id: prefix }, { $max: { seq: existing + 1 } }, { new: true })
      if (!adjustedCounter) throw new Error('Compteur de facturation introuvable')
      counter = adjustedCounter
    }
  }
  return `${prefix}${String(counter!.seq).padStart(pad, '0')}`
}

export function nextQuoteNumero(date = new Date()) {
  return nextNumber(AdminQuote, `DEV-${date.getFullYear()}-`, 4)
}

export function nextInvoiceNumero(date = new Date()) {
  return nextNumber(AdminInvoice, `FAC-${date.getFullYear()}-`, 3)
}

// ─── Calcul des montants (FCFA, arrondis à l'unité) ──────────────────────────

const money = (n: unknown) => Math.round(Number(n) || 0)
const qty = (n: unknown) => Math.max(0, Number(n) || 0)

export const BRS_RATE = 0.05
export const DEFAULT_BRS_THRESHOLD = 25000
export const TVA_RATE_PERCENT = 18

/**
 * Régime fiscal d'un document : BRS et TVA s'excluent (jamais les deux sur un même document).
 * 'none' = client non soumis à la retenue et pas de TVA facturée.
 */
export type TaxRegime = 'brs' | 'tva' | 'none'
export const TAX_REGIMES: TaxRegime[] = ['brs', 'tva', 'none']
export const DEFAULT_TAX_REGIME: TaxRegime = 'brs'

export function isTaxRegime(v: unknown): v is TaxRegime {
  return typeof v === 'string' && (TAX_REGIMES as string[]).includes(v)
}

/**
 * BRS par majoration : le prix saisi pour la main-d'œuvre est le net voulu ; il est porté à
 * net / 0,95 sur le document et la différence est retenue en BRS. Le net à payer reste le prix saisi.
 */
export function grossUpForBrs(netUnitPrice: number) {
  return money(netUnitPrice / (1 - BRS_RATE))
}

/**
 * Lignes avec prix net (saisi) et prix affiché (majoré si BRS sur main-d'œuvre).
 * Le seuil s'apprécie sur la main-d'œuvre nette saisie.
 */
function priceLinesWithBrs<T extends { quantity?: number; unitPrice?: number; netUnitPrice?: number }>(
  items: T[],
  isLabor: (item: T) => boolean,
  applyBRS: boolean,
  threshold: number
) {
  const base = (items || []).map(it => {
    const quantity = qty(it.quantity)
    const netUnitPrice = money(it.netUnitPrice ?? it.unitPrice)
    return { item: it, quantity, netUnitPrice, labor: isLabor(it), netTotal: money(quantity * netUnitPrice) }
  })
  const netLabor = base.filter(b => b.labor).reduce((s, b) => s + b.netTotal, 0)
  const brsOn = applyBRS && netLabor > threshold
  const lines = base.map(b => {
    const unitPrice = brsOn && b.labor ? grossUpForBrs(b.netUnitPrice) : b.netUnitPrice
    return { ...b.item, quantity: b.quantity, netUnitPrice: b.netUnitPrice, unitPrice, total: money(b.quantity * unitPrice) }
  })
  const grossLabor = lines.filter((_, i) => base[i].labor).reduce((s, l) => s + l.total, 0)
  const brsAmount = brsOn ? grossLabor - netLabor : 0
  return { lines, brsAmount }
}

/** Lignes de facture soumises à la BRS (main-d'œuvre / prestations). */
export const LABOR_INVOICE_CATEGORY = 'services'

export interface QuoteLineInput {
  description?: string
  quantity?: number
  unitPrice?: number
  netUnitPrice?: number
  taxable?: boolean
  isLabor?: boolean
  productId?: unknown
}

/**
 * Totaux d'un devis. BRS par majoration de la main-d'œuvre au-delà du seuil (le total reste
 * égal aux prix saisis) ; avec la BRS, aucune TVA.
 */
export function computeQuoteTotals(
  products: QuoteLineInput[],
  opts: { applyBRS?: boolean; brsThreshold?: number; taxAmount?: number; other?: number } = {}
) {
  const priced = priceLinesWithBrs(
    products || [],
    p => !!p.isLabor,
    !!opts.applyBRS,
    Number(opts.brsThreshold ?? DEFAULT_BRS_THRESHOLD)
  )
  const lines = priced.lines.map(l => ({ ...l, taxable: l.taxable !== false, isLabor: !!l.isLabor }))
  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const brsAmount = priced.brsAmount
  const taxAmount = opts.applyBRS ? 0 : money(opts.taxAmount)
  const other = money(opts.other)
  const taxRegime: TaxRegime = opts.applyBRS ? 'brs' : taxAmount > 0 ? 'tva' : 'none'
  return { products: lines, subtotal, brsAmount, taxAmount, other, taxRegime, total: subtotal - brsAmount + taxAmount + other }
}

export interface InvoiceLineInput {
  description?: string
  quantity?: number
  unitPrice?: number
  netUnitPrice?: number
  category?: string
  productId?: string
}

/**
 * Totaux d'une facture selon le régime : BRS par majoration des lignes de prestations (sans TVA),
 * ou TVA au taux indiqué (sans BRS), ou ni l'une ni l'autre.
 */
export function computeInvoiceTotals(
  items: InvoiceLineInput[],
  opts: { taxRegime?: TaxRegime; taxRate?: number; brsThreshold?: number } = {}
) {
  const taxRegime: TaxRegime = isTaxRegime(opts.taxRegime) ? opts.taxRegime : DEFAULT_TAX_REGIME
  const brsThreshold = Math.max(0, Number(opts.brsThreshold ?? DEFAULT_BRS_THRESHOLD))
  const priced = priceLinesWithBrs(items || [], it => it.category === LABOR_INVOICE_CATEGORY, taxRegime === 'brs', brsThreshold)
  const lines = priced.lines.map(({ total, ...l }) => ({ ...l, totalPrice: total }))
  const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0)
  const brsAmount = priced.brsAmount
  const taxRate = taxRegime === 'tva' ? Math.max(0, Number(opts.taxRate ?? TVA_RATE_PERCENT) || 0) : 0
  const taxAmount = money(subtotal * taxRate / 100)
  return { items: lines, subtotal, taxRegime, brsThreshold, taxRate, taxAmount, brsAmount, total: subtotal + taxAmount - brsAmount }
}

/** Régime d'un document existant qui n'a pas encore le champ (anciens enregistrements). */
export function inferInvoiceRegime(doc: { taxRegime?: unknown; taxRate?: number; brsAmount?: number } | null | undefined): TaxRegime {
  if (isTaxRegime(doc?.taxRegime)) return doc!.taxRegime as TaxRegime
  if (Number(doc?.taxRate) > 0) return 'tva'
  return DEFAULT_TAX_REGIME
}

// ─── Cycle de vie ─────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled']
/** Factures émises restant à encaisser (créances). */
export const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ['sent', 'overdue', 'partial']

// Changements de statut manuels. "partial" ne s'obtient qu'en enregistrant un paiement ;
// une facture émise ne s'annule que par un avoir (numérotation continue, trace comptable).
const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'paid', 'cancelled'],
  sent: ['paid', 'overdue'],
  overdue: ['paid', 'sent'],
  partial: ['paid'],
  paid: [],
  cancelled: [],
}

export function isInvoiceStatus(v: unknown): v is InvoiceStatus {
  return typeof v === 'string' && (INVOICE_STATUSES as string[]).includes(v)
}

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus) {
  return from === to || (INVOICE_TRANSITIONS[from] || []).includes(to)
}

export function isInvoiceLocked(status: string) {
  return status === 'paid' || status === 'cancelled'
}

/** Reste dû = total - avoirs - encaissements. */
export function invoiceBalance(inv: { total?: number; creditedAmount?: number; amountPaid?: number }) {
  return Math.max(0, money(inv.total) - money(inv.creditedAmount) - money(inv.amountPaid))
}

export function nextCreditNoteNumero(date = new Date()) {
  return nextNumber(CreditNote, `AV-${date.getFullYear()}-`, 3)
}

export async function nextExpenseNumero(date = new Date()) {
  const { default: Expense } = await import('@/lib/models/Expense')
  return nextNumber(Expense as unknown as Model<any>, `DEP-${date.getFullYear()}-`, 4)
}

/**
 * Ramène l'historique de paiements d'une dépense au montant payé demandé : l'écart est enregistré
 * comme un paiement daté (négatif = correction). Les anciennes dépenses sans historique sont reprises.
 */
export function reconcileExpensePayments(
  existing: { payments?: any[]; paidAmount?: number; paidAt?: Date; expenseDate?: Date } | null,
  targetPaid: number,
  at: Date,
  method: string | undefined,
  userId: string
) {
  const payments = Array.isArray(existing?.payments) ? existing!.payments.map(p => ({ ...p })) : []
  const legacyPaid = money(existing?.paidAmount)
  if (payments.length === 0 && legacyPaid > 0) {
    payments.push({ amount: legacyPaid, date: existing?.paidAt || existing?.expenseDate || at, note: 'Reprise historique' })
  }
  const recorded = payments.reduce((s, p) => s + money(p.amount), 0)
  const delta = money(targetPaid) - recorded
  if (delta !== 0) payments.push({ amount: delta, date: at, method, note: delta < 0 ? 'Correction' : undefined, recordedBy: userId })
  return payments
}

/** Statut d'une dépense déduit du montant réglé (sauf annulation explicite). */
export function expenseStatusFor(requested: string | undefined, paid: number, netPayable: number) {
  if (requested === 'cancelled') return 'cancelled'
  if (netPayable > 0 && paid >= netPayable) return 'paid'
  return paid > 0 ? 'partial' : 'unpaid'
}

/** Un devis accepté (éventuellement signé) ou remplacé ne change plus : en faire une nouvelle version. */
export function isQuoteLocked(status: string) {
  return status === 'accepted' || status === 'superseded'
}

/** Passe en retard les factures envoyées dont l'échéance est dépassée. */
export async function markOverdueInvoices(now = new Date()) {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const res = await AdminInvoice.updateMany(
    { status: 'sent', dueDate: { $lt: startOfToday } },
    { $set: { status: 'overdue' } }
  )
  return res.modifiedCount
}

const PRE_APPROVAL_PROJECT_STATUSES = ['lead', 'quoted', 'negotiation']

/**
 * Répercute la décision du client sur le projet lié au devis :
 * résumé financier (HT/TTC), statut "approuvé" si le projet n'avait pas démarré, entrée de timeline.
 */
export async function syncProjectWithQuoteDecision(
  quote: { _id: unknown; numero?: string; projectId?: unknown; subtotal?: number; brsAmount?: number; total?: number; validUntil?: Date },
  decision: 'accepted' | 'rejected',
  author: string
) {
  if (!quote.projectId) return
  const project = await Project.findById(quote.projectId)
  if (!project) return

  const now = new Date()
  project.quote = {
    id: String(quote._id),
    version: (project.quote?.version || 0) + (project.quote?.id === String(quote._id) ? 0 : 1),
    totalHT: Math.round((Number(quote.subtotal) || 0) - (Number(quote.brsAmount) || 0)),
    totalTTC: Math.round(Number(quote.total) || 0),
    margin: project.quote?.margin || 0,
    validUntil: quote.validUntil || project.quote?.validUntil || now,
    status: decision === 'accepted' ? 'approved' : 'rejected',
  } as any

  if (decision === 'accepted') {
    if (!project.value) project.value = Math.round(Number(quote.total) || 0)
    if (PRE_APPROVAL_PROJECT_STATUSES.includes(project.status)) {
      project.status = 'approved'
      project.statusHistory = [...(project.statusHistory || []), { date: now, status: 'approved', author, note: `Devis ${quote.numero || ''} accepté` }] as any
    }
  }
  project.timeline = [...(project.timeline || []), {
    id: `quote-${String(quote._id)}-${decision}`,
    date: now,
    type: decision === 'accepted' ? 'approved' : 'issue',
    title: decision === 'accepted' ? `Devis ${quote.numero || ''} accepté` : `Devis ${quote.numero || ''} refusé`,
    author,
    clientVisible: true,
  }] as any
  await project.save()
}
