import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { requireAdminApi } from '@/lib/api-auth'

function toDate(value: any): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

function asObjectIdString(value: any): string | null {
  const s = String(value || '').trim()
  if (!s) return null
  return /^[a-fA-F0-9]{24}$/.test(s) ? s : null
}

async function resolveClientLinks(body: any): Promise<{ clientUserId?: string; clientCompanyId?: string }> {
  const directUserId = asObjectIdString(body?.clientUserId)
  const directCompanyId = asObjectIdString(body?.clientCompanyId)
  if (directUserId || directCompanyId) {
    return {
      clientUserId: directUserId || undefined,
      clientCompanyId: directCompanyId || undefined
    }
  }

  const email = String(body?.client?.email || '').trim().toLowerCase()
  const company = String(body?.client?.company || '').trim()
  const name = String(body?.client?.name || '').trim()

  const links: { clientUserId?: string; clientCompanyId?: string } = {}

  if (email) {
    const user = await User.findOne({ email }).select({ _id: 1 }).lean() as any
    if (user?._id) links.clientUserId = String(user._id)

    const client = await Client.findOne({ email }).select({ _id: 1 }).lean() as any
    if (client?._id) links.clientCompanyId = String(client._id)
  }

  if (!links.clientCompanyId && (company || name)) {
    const key = company || name
    const client = await Client.findOne({ $or: [{ company: key }, { name: key }] }).select({ _id: 1 }).lean() as any
    if (client?._id) links.clientCompanyId = String(client._id)
  }

  return links
}

async function generateInvoiceNumero(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `FAC-${year}-`
  const last = await AdminInvoice.findOne({ numero: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select({ numero: 1 })
    .lean() as any

  const lastNumero = String(last?.numero || '')
  const m = lastNumero.match(/-(\d{3,})$/)
  const next = m?.[1] ? Number(m[1]) + 1 : 1
  const padded = String(next).padStart(3, '0')
  return `${prefix}${padded}`
}

// GET: lister les factures
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectMongoose()

    const invoices = await AdminInvoice.find().sort({ createdAt: -1 }).lean() as any[]

    // Adapter au format utilisé par l'UI (id/number)
    const normalized = invoices.map((inv) => ({
      id: String(inv._id),
      number: inv.numero,
      date: inv.date ? new Date(inv.date).toISOString().slice(0, 10) : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
      status: inv.status,
      client: inv.client,
      items: inv.items,
      subtotal: inv.subtotal,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      total: inv.total,
      notes: inv.notes || '',
      terms: inv.terms || '',
      createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : new Date().toISOString(),
      createdBy: inv.createdBy || auth.user.id,
      quoteId: inv.quoteId,
      paymentMethod: inv.paymentMethod,
      paymentDate: inv.paymentDate,
      projectId: inv.projectId,
      clientUserId: inv.clientUserId,
      clientCompanyId: inv.clientCompanyId,
      sentAt: inv.sentAt,
      paidAt: inv.paidAt
    }))

    return NextResponse.json({ invoices: normalized })
  } catch (error) {
    console.error('Erreur GET /api/admin/invoices:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des factures' }, { status: 500 })
  }
}

// POST: créer ou mettre à jour une facture
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null) as any
    if (!body) return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })

    await connectMongoose()

    const id = String(body.id || body._id || '').trim() || undefined
    const numero = String(body.numero || body.number || '').trim() || await generateInvoiceNumero()

    const projectId = asObjectIdString(body?.projectId)
    const links = await resolveClientLinks(body)

    const invoiceData: any = {
      numero,
      date: toDate(body.date) || new Date(),
      dueDate: toDate(body.dueDate),
      status: body.status || 'draft',

      projectId: projectId || undefined,
      clientUserId: links.clientUserId,
      clientCompanyId: links.clientCompanyId,

      client: body.client,
      items: Array.isArray(body.items) ? body.items : [],
      subtotal: Number(body.subtotal || 0),
      taxRate: Number(body.taxRate ?? 18),
      taxAmount: Number(body.taxAmount || 0),
      total: Number(body.total || 0),
      notes: body.notes,
      terms: body.terms,
      quoteId: body.quoteId,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      createdBy: auth.user.id
    }

    let saved: any
    if (id) {
      saved = await AdminInvoice.findByIdAndUpdate(id, { $set: invoiceData }, { new: true }).lean()
      if (!saved) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    } else {
      const created = new AdminInvoice(invoiceData)
      await created.save()
      saved = created.toObject()
    }

    const normalized = {
      id: String(saved._id),
      number: saved.numero,
      date: saved.date ? new Date(saved.date).toISOString().slice(0, 10) : '',
      dueDate: saved.dueDate ? new Date(saved.dueDate).toISOString().slice(0, 10) : '',
      status: saved.status,
      client: saved.client,
      items: saved.items,
      subtotal: saved.subtotal,
      taxRate: saved.taxRate,
      taxAmount: saved.taxAmount,
      total: saved.total,
      notes: saved.notes || '',
      terms: saved.terms || '',
      createdAt: saved.createdAt ? new Date(saved.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : new Date().toISOString(),
      createdBy: saved.createdBy || auth.user.id,
      quoteId: saved.quoteId,
      paymentMethod: saved.paymentMethod,
      paymentDate: saved.paymentDate,
      projectId: saved.projectId,
      clientUserId: saved.clientUserId,
      clientCompanyId: saved.clientCompanyId,
      sentAt: saved.sentAt,
      paidAt: saved.paidAt
    }

    return NextResponse.json({ success: true, invoice: normalized })
  } catch (error: any) {
    const message = error?.code === 11000 ? 'Numéro de facture déjà utilisé' : 'Erreur lors de la sauvegarde de la facture'
    console.error('Erreur POST /api/admin/invoices:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH: mise à jour statut/paiement
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null) as any
    const id = String(body?.id || '').trim()
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    await connectMongoose()

    const update: any = {}
    if (body.status) update.status = body.status
    if (body.paymentMethod !== undefined) update.paymentMethod = body.paymentMethod
    if (body.paymentDate !== undefined) update.paymentDate = body.paymentDate

    const saved = await AdminInvoice.findByIdAndUpdate(id, { $set: update }, { new: true }).lean() as any
    if (!saved) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur PATCH /api/admin/invoices:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

// DELETE: supprimer une facture
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    await connectMongoose()

    await AdminInvoice.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/invoices:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
