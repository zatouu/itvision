import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const companyId = new mongoose.Types.ObjectId(auth.user.companyClientId)
  const userFilter = { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] }

  const invoice = await AdminInvoice.findOne({
    _id: new mongoose.Types.ObjectId(id),
    ...userFilter,
  }).lean() as any

  if (!invoice) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }

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
    total: invoice.total,
    notes: invoice.notes,
    terms: invoice.terms,
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
