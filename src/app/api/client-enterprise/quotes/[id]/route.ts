import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import AdminQuote from '@/lib/models/AdminQuote'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

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
    attachments: (quote.attachments || []).map((a: any) => ({
      name: a.name,
      url: a.url,
      type: a.type,
      size: a.size,
      uploadedAt: a.uploadedAt,
      category: a.category,
    })),
    clientResponse: quote.clientResponse,
    clientRespondedAt: quote.clientRespondedAt,
    clientCounterAmount: quote.clientCounterAmount,
    clientSignature: quote.clientSignature ? {
      signature: quote.clientSignature.signature,
      name: quote.clientSignature.name,
      signedAt: quote.clientSignature.signedAt,
    } : null,
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
