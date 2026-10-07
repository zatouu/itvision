import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { computeInvoiceTotals, nextInvoiceNumero, LABOR_INVOICE_CATEGORY, type TaxRegime } from '@/lib/finance/billing'

const DEFAULT_DUE_DAYS = 30

/**
 * POST /api/admin/invoices/from-quote { quoteId, dueInDays? }
 * Facture brouillon issue d'un devis accepté : mêmes lignes, même client (et lien portail), même projet.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const quoteId = String(body?.quoteId || '')
    if (!mongoose.Types.ObjectId.isValid(quoteId)) return NextResponse.json({ error: 'quoteId invalide' }, { status: 400 })

    await connectMongoose()
    const quote = await AdminQuote.findById(quoteId).lean() as any
    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (quote.status !== 'accepted') {
      return NextResponse.json({ error: 'Seul un devis accepté par le client peut être facturé' }, { status: 409 })
    }

    const already = await AdminInvoice.findOne({ quoteId, status: { $ne: 'cancelled' } }).select('numero').lean() as any
    if (already) {
      return NextResponse.json({ error: `Ce devis est déjà facturé (${already.numero})`, invoiceId: String(already._id) }, { status: 409 })
    }

    const subtotalHT = (quote.products || []).reduce((s: number, p: any) => s + (Number(p.total) || 0), 0)
    // Même régime que le devis : BRS (sans TVA), TVA (taux retrouvé depuis le montant), ou aucun
    const taxRegime: TaxRegime = quote.applyBRS ? 'brs' : quote.taxAmount > 0 ? 'tva' : 'none'
    const taxRate = taxRegime === 'tva' && subtotalHT > 0 ? Math.round((quote.taxAmount / subtotalHT) * 100) : 0

    const items = [
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
    const totals = computeInvoiceTotals(items, { taxRegime, taxRate, brsThreshold: quote.brsThreshold })

    const dueInDays = Math.min(Math.max(Number(body?.dueInDays) || DEFAULT_DUE_DAYS, 0), 365)
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
      notes: `Facture établie selon le devis ${quote.numero}${quote.title ? ` — ${quote.title}` : ''}`,
      terms: quote.conditions || `Paiement à ${dueInDays} jours.`,
      createdBy: auth.user.id,
    })

    return NextResponse.json({
      success: true,
      invoiceId: String(invoice._id),
      numero: invoice.numero,
      // Écart d'arrondi éventuel entre le total du devis et celui recalculé
      totalMismatch: totals.total !== Math.round(Number(quote.total) || 0) ? { quote: quote.total, invoice: totals.total } : null,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erreur POST /api/admin/invoices/from-quote:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la facture' }, { status: 500 })
  }
}
