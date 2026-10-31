import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, requireCompanyCapability } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { CLIENT_VISIBLE_INVOICE } from '@/lib/client-documents'
import CreditNote from '@/lib/models/CreditNote'
import { invoiceBalance } from '@/lib/finance/billing'
import { companyBankDetails } from '@/lib/finance/bank-details'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  const denied = requireCompanyCapability(access, 'finance:view')
  if (denied) return denied

  const companyClientId = access.profiles.companyClientId
  if (!companyClientId) {
    return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })
  }

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = new mongoose.Types.ObjectId(companyClientId)
  const userFilter = { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }

  const invoice = await AdminInvoice.findOne({
    _id: new mongoose.Types.ObjectId(id),
    ...userFilter,
    ...CLIENT_VISIBLE_INVOICE,
  }).lean() as any

  if (!invoice) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }

  const creditNotes = await CreditNote.find({ invoiceId: invoice._id }).select('numero date total').sort({ date: 1 }).lean()

  const data = {
    _id: String(invoice._id),
    numero: invoice.numero,
    date: invoice.date,
    dueDate: invoice.dueDate,
    status: invoice.status,
    client: invoice.client,
    items: (invoice.items || []).map((it: any) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      category: it.category,
    })),
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    brsAmount: invoice.brsAmount || 0,
    total: invoice.total,
    amountPaid: invoice.amountPaid || 0,
    creditedAmount: invoice.creditedAmount || 0,
    balance: invoice.status === 'cancelled' ? 0 : invoiceBalance(invoice),
    payments: (invoice.payments || []).map((p: any) => ({ date: p.date, amount: p.amount, method: p.method })),
    creditNotes: creditNotes.map((c: any) => ({ _id: String(c._id), numero: c.numero, date: c.date, total: c.total })),
    // Virement : mode de règlement B2B, libellé = numéro de facture
    bankDetails: ['paid', 'cancelled'].includes(invoice.status) ? null : companyBankDetails(),
    notes: invoice.notes,
    terms: invoice.terms,
    attachments: (invoice.attachments || []).map((a: any) => ({
      name: a.name,
      url: a.url,
      type: a.type,
      size: a.size,
      uploadedAt: a.uploadedAt,
      category: a.category,
    })),
    quoteId: invoice.quoteId,
    paymentMethod: invoice.paymentMethod,
    paymentDate: invoice.paymentDate,
    paidAt: invoice.paidAt,
    sentAt: invoice.sentAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  }

  return NextResponse.json({ invoice: data })
}
