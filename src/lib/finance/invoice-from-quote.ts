import mongoose from 'mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { computeInvoiceTotals, nextInvoiceNumero, LABOR_INVOICE_CATEGORY, type TaxRegime } from '@/lib/finance/billing'
import { syncProjectFinanceSafe } from '@/lib/finance/project-finance'

const DEFAULT_DUE_DAYS = 30

export type InvoiceMode = 'full' | 'deposit' | 'balance'

export type InvoiceFromQuoteResult =
  | { ok: true; invoiceId: string; numero: string; mode: InvoiceMode; total: number; remaining: number; totalMismatch: { quote: number; invoice: number } | null }
  | { ok: false; status: number; error: string; invoiceId?: string; remaining?: number }

/**
 * Facture brouillon issue d'un devis accepté : même client (et lien portail), même projet.
 * - full : mêmes lignes que le devis (aucune facture active sur ce devis)
 * - deposit : acompte de `percent` % du net à payer du devis
 * - balance : solde = devis − factures actives déjà émises sur ce devis (avoirs déduits)
 * La somme facturée sur un devis ne dépasse jamais son montant.
 */
export async function createInvoiceFromQuote(opts: {
  quoteId: string
  mode?: InvoiceMode
  percent?: number
  dueInDays?: number
  createdBy?: string
}): Promise<InvoiceFromQuoteResult> {
  const { quoteId } = opts
  if (!mongoose.Types.ObjectId.isValid(quoteId)) return { ok: false, status: 400, error: 'quoteId invalide' }
  const mode: InvoiceMode = opts.mode === 'deposit' || opts.mode === 'balance' ? opts.mode : 'full'

  const quote = await AdminQuote.findById(quoteId).lean() as any
  if (!quote) return { ok: false, status: 404, error: 'Devis introuvable' }
  if (quote.status !== 'accepted') {
    return { ok: false, status: 409, error: 'Seul un devis accepté par le client peut être facturé' }
  }

  const previous = await AdminInvoice.find({ quoteId, status: { $ne: 'cancelled' } }).select('numero total creditedAmount').lean() as any[]
  const quoteTotal = Math.round(Number(quote.total) || 0)
  const alreadyInvoiced = previous.reduce((s, inv) => s + Math.round(Number(inv.total) || 0) - Math.round(Number(inv.creditedAmount) || 0), 0)
  const remaining = Math.max(0, quoteTotal - alreadyInvoiced)

  if (mode === 'full' && previous.length) {
    return {
      ok: false,
      status: 409,
      error: `Ce devis est déjà facturé (${previous.map(p => p.numero).join(', ')}) : facturez le solde`,
      invoiceId: String(previous[0]._id),
      remaining,
    }
  }
  if (mode !== 'full' && remaining <= 0) {
    return { ok: false, status: 409, error: 'Le devis est entièrement facturé', remaining: 0 }
  }

  let items: any[]
  let totals: ReturnType<typeof computeInvoiceTotals>
  let label = ''
  if (mode === 'full') {
    const subtotalHT = (quote.products || []).reduce((s: number, p: any) => s + (Number(p.total) || 0), 0)
    // Même régime que le devis : BRS (sans TVA), TVA (taux retrouvé depuis le montant), ou aucun
    const taxRegime: TaxRegime = quote.applyBRS ? 'brs' : quote.taxAmount > 0 ? 'tva' : 'none'
    const taxRate = taxRegime === 'tva' && subtotalHT > 0 ? Math.round((quote.taxAmount / subtotalHT) * 100) : 0
    items = [
      ...(quote.products || []).map((p: any) => ({
        description: p.description,
        quantity: p.quantity,
        // Prix saisi sur le devis : la majoration BRS est recalculée à l'identique
        unitPrice: p.netUnitPrice ?? p.unitPrice,
        netUnitPrice: p.netUnitPrice ?? p.unitPrice,
        category: p.isLabor ? LABOR_INVOICE_CATEGORY : 'products',
        productId: p.productId ? String(p.productId) : undefined,
      })),
      ...(quote.other > 0 ? [{ description: 'Autres frais', quantity: 1, unitPrice: quote.other, category: 'products' }] : []),
    ]
    totals = computeInvoiceTotals(items, { taxRegime, taxRate, brsThreshold: quote.brsThreshold })
  } else {
    // Acompte / solde : montant net à payer du devis (taxes déjà comprises), sans nouvelle taxe
    const percent = Math.min(90, Math.max(1, Math.round(Number(opts.percent) || 30)))
    const amount = mode === 'deposit' ? Math.min(remaining, Math.round(quoteTotal * percent / 100)) : remaining
    label = mode === 'deposit' ? `Acompte ${percent} %` : 'Solde'
    items = [{
      description: mode === 'deposit'
        ? `Acompte de ${percent} % sur le devis ${quote.numero}${quote.title ? ` — ${quote.title}` : ''}`
        : `Solde du devis ${quote.numero}${previous.length ? ` (déduction faite de ${previous.map(p => p.numero).join(', ')})` : ''}`,
      quantity: 1,
      unitPrice: amount,
      category: 'products',
    }]
    totals = computeInvoiceTotals(items, { taxRegime: 'none' })
  }

  const dueInDays = Math.min(Math.max(Number(opts.dueInDays) || DEFAULT_DUE_DAYS, 0), 365)
  const invoice = await AdminInvoice.create({
    numero: await nextInvoiceNumero(),
    date: new Date(),
    dueDate: new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000),
    status: 'draft',
    quoteId: String(quote._id),
    projectId: quote.projectId,
    clientUserId: quote.clientUserId,
    clientCompanyId: quote.clientCompanyId,
    client: {
      name: quote.client?.name || 'Client',
      email: quote.client?.email,
      phone: quote.client?.phone,
      address: quote.client?.address,
      taxId: quote.client?.ninea,
    },
    items: totals.items,
    subtotal: totals.subtotal,
    taxRegime: totals.taxRegime,
    brsThreshold: totals.brsThreshold,
    taxRate: totals.taxRate,
    taxAmount: totals.taxAmount,
    brsAmount: totals.brsAmount,
    total: totals.total,
    notes: `${label ? `${label} — ` : ''}Facture établie selon le devis ${quote.numero}${quote.title ? ` — ${quote.title}` : ''}`,
    terms: quote.conditions || `Paiement à ${dueInDays} jours.`,
    createdBy: opts.createdBy,
  })
  syncProjectFinanceSafe(quote.projectId)

  return {
    ok: true,
    invoiceId: String(invoice._id),
    numero: invoice.numero,
    mode,
    total: totals.total,
    remaining: Math.max(0, remaining - totals.total),
    // Écart d'arrondi éventuel entre le total du devis et celui recalculé
    totalMismatch: mode === 'full' && totals.total !== quoteTotal ? { quote: quote.total, invoice: totals.total } : null,
  }
}
