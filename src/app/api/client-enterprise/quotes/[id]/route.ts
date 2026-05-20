import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import AdminQuote from '@/lib/models/AdminQuote'

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

  const quote = await AdminQuote.findOne({
    _id: new mongoose.Types.ObjectId(id),
    ...userFilter,
  }).lean() as any

  if (!quote) {
    return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
  }

  const data = {
    _id: String(quote._id),
    numero: quote.numero,
    title: quote.title,
    date: quote.date,
    status: quote.status,
    client: quote.client,
    products: (quote.products || []).map((p: any) => ({
      description: p.description,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      taxable: p.taxable,
      total: p.total,
    })),
    subtotal: quote.subtotal,
    brsAmount: quote.brsAmount,
    taxAmount: quote.taxAmount,
    other: quote.other,
    total: quote.total,
    notes: quote.notes,
    bonCommande: quote.bonCommande,
    dateLivraison: quote.dateLivraison,
    pointExpedition: quote.pointExpedition,
    conditions: quote.conditions,
    clientResponse: quote.clientResponse,
    clientRespondedAt: quote.clientRespondedAt,
    clientCounterAmount: quote.clientCounterAmount,
    clientComments: (quote.clientComments || []).map((c: any) => ({
      _id: String(c._id || c.authorId),
      authorRole: c.authorRole,
      message: c.message,
      createdAt: c.createdAt,
      readByOther: c.readByOther,
    })),
    sentAt: quote.sentAt,
    acceptedAt: quote.acceptedAt,
    rejectedAt: quote.rejectedAt,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  }

  return NextResponse.json({ quote: data })
}
