import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Expense from '@/lib/models/Expense'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { requireAdminApi } from '@/lib/api-auth'
import {
  canTransitionInvoice,
  computeInvoiceTotals,
  inferInvoiceRegime,
  invoiceBalance,
  isInvoiceLocked,
  isInvoiceStatus,
  isTaxRegime,
  nextInvoiceNumero,
  type InvoiceStatus,
} from '@/lib/finance/billing'
import { syncProjectFinance, syncProjectFinanceSafe } from '@/lib/finance/project-finance'
import AdminQuote from '@/lib/models/AdminQuote'

export const dynamic = 'force-dynamic'

/** Horodatages dérivés du statut (la trésorerie et le portail client s'appuient dessus). */
function statusTimestamps(to: InvoiceStatus, current: any, paymentDate?: string) {
  const set: Record<string, unknown> = {}
  const now = new Date()
  if (to === 'sent' && !current?.sentAt) set.sentAt = now
  if (to === 'paid' && !current?.paidAt) {
    set.paidAt = paymentDate ? new Date(paymentDate) : now
    if (!paymentDate && !current?.paymentDate) set.paymentDate = now.toISOString().slice(0, 10)
  }
  return set
}

/** Passage manuel à "payée" : le reste dû est enregistré comme paiement (la trésorerie lit les paiements). */
function settlementPayment(to: InvoiceStatus, current: any, total: number, body: any, userId: string) {
  if (to !== 'paid' || current?.status === 'paid') return null
  const amount = invoiceBalance({ total, creditedAmount: current?.creditedAmount, amountPaid: current?.amountPaid })
  if (amount <= 0) return null
  const date = body?.paymentDate ? new Date(body.paymentDate) : new Date()
  return {
    amount,
    date: isNaN(date.getTime()) ? new Date() : date,
    method: typeof body?.paymentMethod === 'string' && body.paymentMethod.trim() ? body.paymentMethod.slice(0, 50) : 'Virement',
    note: 'Solde (facture marquée payée)',
    recordedBy: userId,
  }
}

function normalizeInvoice(inv: any, fallbackUserId: string) {
  return {
    id: String(inv._id),
    number: inv.numero,
    date: inv.date ? new Date(inv.date).toISOString().slice(0, 10) : '',
    dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
    status: inv.status,
    client: inv.client,
    items: inv.items,
    subtotal: inv.subtotal,
    taxRegime: inferInvoiceRegime(inv),
    brsThreshold: inv.brsThreshold ?? 25000,
    taxRate: inv.taxRate,
    taxAmount: inv.taxAmount,
    brsAmount: inv.brsAmount || 0,
    total: inv.total,
    amountPaid: inv.amountPaid || 0,
    creditedAmount: inv.creditedAmount || 0,
    balance: ['draft', 'cancelled'].includes(inv.status) ? 0 : invoiceBalance(inv),
    payments: inv.payments || [],
    creditNoteIds: (inv.creditNoteIds || []).map(String),
    reminders: inv.reminders || [],
    notes: inv.notes || '',
    terms: inv.terms || '',
    createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : new Date().toISOString(),
    createdBy: inv.createdBy || fallbackUserId,
    quoteId: inv.quoteId,
    paymentMethod: inv.paymentMethod,
    paymentDate: inv.paymentDate,
    projectId: inv.projectId,
    clientUserId: inv.clientUserId,
    clientCompanyId: inv.clientCompanyId,
    sentAt: inv.sentAt,
    paidAt: inv.paidAt,
    attachments: inv.attachments || []
  }
}

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

// GET: lister les factures
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectMongoose()

    const invoices = await AdminInvoice.find().sort({ createdAt: -1 }).lean() as any[]

    // Adapter au format utilisé par l'UI (id/number)
    const normalized = invoices.map((inv) => normalizeInvoice(inv, auth.user.id))

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

    const id = asObjectIdString(body.id || body._id) || undefined
    const existing = id ? await AdminInvoice.findById(id).lean() as any : null
    if (id && !existing) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (existing && existing.status === 'cancelled') {
      return NextResponse.json({ error: 'Facture annulée : document définitif' }, { status: 409 })
    }

    const status = body.status || existing?.status || 'draft'
    if (!isInvoiceStatus(status)) return NextResponse.json({ error: `Statut invalide : ${status}` }, { status: 400 })
    if (existing && !canTransitionInvoice(existing.status, status)) {
      return NextResponse.json({ error: `Passage de « ${existing.status} » à « ${status} » interdit` }, { status: 409 })
    }

    // Facture émise : montants, client et lignes figés (correction = avoir) ; seuls pièces jointes, notes et statut évoluent
    if (existing && existing.status !== 'draft') {
      const set: Record<string, unknown> = {
        status,
        ...statusTimestamps(status, existing, body.paymentDate),
      }
      if (Array.isArray(body.attachments)) set.attachments = body.attachments
      if (typeof body.notes === 'string') set.notes = body.notes
      if (typeof body.paymentMethod === 'string') set.paymentMethod = body.paymentMethod
      const payment = settlementPayment(status, existing, existing.total, body, auth.user.id)
      const update: any = { $set: set }
      if (payment) {
        update.$push = { payments: payment }
        update.$inc = { amountPaid: payment.amount }
      }
      const saved = await AdminInvoice.findOneAndUpdate({ _id: existing._id, updatedAt: existing.updatedAt }, update, { new: true }).lean() as any
      if (!saved) return NextResponse.json({ error: 'La facture a été modifiée entre-temps, rechargez' }, { status: 409 })
      syncProjectFinanceSafe(saved.projectId)
      return NextResponse.json({ success: true, invoice: normalizeInvoice(saved, auth.user.id) })
    }

    const numero = existing?.numero || String(body.numero || body.number || '').trim() || await nextInvoiceNumero()

    let projectId = asObjectIdString(body?.projectId)
    // Une facture issue d'un devis rejoint le projet du devis (montants comparés au contrat)
    if (!projectId && asObjectIdString(body?.quoteId)) {
      const sourceQuote = await AdminQuote.findById(body.quoteId).select('projectId').lean() as any
      if (sourceQuote?.projectId) projectId = String(sourceQuote.projectId)
    }
    const links = await resolveClientLinks(body)
    // Lignes et totaux recalculés : le montant facturé ne dépend pas du navigateur
    const taxRegime = isTaxRegime(body.taxRegime) ? body.taxRegime : inferInvoiceRegime(existing || body)
    const totals = computeInvoiceTotals(Array.isArray(body.items) ? body.items : [], {
      taxRegime,
      taxRate: body.taxRate ?? existing?.taxRate,
      brsThreshold: body.brsThreshold ?? existing?.brsThreshold,
    })
    const payment = settlementPayment(status, existing, totals.total, body, auth.user.id)

    const invoiceData: any = {
      numero,
      date: toDate(body.date) || existing?.date || new Date(),
      dueDate: toDate(body.dueDate),
      status,

      projectId: projectId || undefined,
      clientUserId: links.clientUserId,
      clientCompanyId: links.clientCompanyId,

      client: body.client,
      items: totals.items,
      subtotal: totals.subtotal,
      taxRegime: totals.taxRegime,
      brsThreshold: totals.brsThreshold,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      brsAmount: totals.brsAmount,
      total: totals.total,
      notes: body.notes,
      terms: body.terms,
      quoteId: body.quoteId,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate,
      createdBy: existing?.createdBy || auth.user.id,
      attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
      ...statusTimestamps(status, existing, body.paymentDate),
      ...(payment ? { payments: [payment], amountPaid: payment.amount } : {}),
    }

    let saved: any
    if (id) {
      saved = await AdminInvoice.findOneAndUpdate({ _id: id, status: 'draft' }, { $set: invoiceData }, { new: true, runValidators: true }).lean()
      if (!saved) return NextResponse.json({ error: 'La facture a été modifiée entre-temps, rechargez' }, { status: 409 })
      // Lignes de refacturation retirées du brouillon : la dépense redevient refacturable
      const keptExpenseIds = (saved.items || []).map((it: any) => it.expenseId).filter(Boolean)
      await Expense.updateMany(
        { billedToInvoiceId: saved._id, _id: { $nin: keptExpenseIds } },
        { $unset: { billedToInvoiceId: 1 } }
      )
    } else {
      const created = new AdminInvoice(invoiceData)
      await created.save()
      saved = created.toObject()
    }

    const previousProjectId = existing?.projectId ? String(existing.projectId) : ''
    const finance = saved.projectId ? await syncProjectFinance(saved.projectId).catch(() => null) : null
    if (previousProjectId && previousProjectId !== String(saved.projectId || '')) syncProjectFinanceSafe(previousProjectId)

    return NextResponse.json({ success: true, invoice: normalizeInvoice(saved, auth.user.id), financeWarnings: finance?.warnings || [] })
  } catch (error: any) {
    const message = error?.code === 11000 ? 'Numéro de facture déjà utilisé' : 'Erreur lors de la sauvegarde de la facture'
    console.error('Erreur POST /api/admin/invoices:', error)
    return NextResponse.json({ error: message }, { status: error?.code === 11000 ? 409 : 500 })
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

    const current = await AdminInvoice.findById(id).select('status sentAt paidAt paymentDate total amountPaid creditedAmount').lean() as any
    if (!current) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const update: any = {}
    let payment: ReturnType<typeof settlementPayment> = null
    if (body.status) {
      if (!isInvoiceStatus(body.status)) return NextResponse.json({ error: `Statut invalide : ${body.status}` }, { status: 400 })
      if (!canTransitionInvoice(current.status, body.status)) {
        return NextResponse.json({ error: `Passage de « ${current.status} » à « ${body.status} » interdit` }, { status: 409 })
      }
      update.status = body.status
      Object.assign(update, statusTimestamps(body.status, current, body.paymentDate))
      payment = settlementPayment(body.status, current, current.total, body, auth.user.id)
    } else if (isInvoiceLocked(current.status)) {
      return NextResponse.json({ error: 'Facture payée ou annulée : non modifiable' }, { status: 409 })
    }
    if (body.paymentMethod !== undefined) update.paymentMethod = body.paymentMethod
    if (body.paymentDate !== undefined) update.paymentDate = body.paymentDate

    const mongoUpdate: any = { $set: update }
    if (payment) {
      mongoUpdate.$push = { payments: payment }
      mongoUpdate.$inc = { amountPaid: payment.amount }
    }
    // Condition sur le statut lu : deux mises à jour concurrentes ne peuvent pas s'écraser
    const saved = await AdminInvoice.findOneAndUpdate({ _id: id, status: current.status }, mongoUpdate, { new: true }).lean() as any
    if (!saved) return NextResponse.json({ error: 'La facture a été modifiée entre-temps, rechargez' }, { status: 409 })
    syncProjectFinanceSafe(saved.projectId)

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

    const invoice = await AdminInvoice.findById(id).select('status projectId').lean() as any
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    // Numérotation continue obligatoire : seule une facture jamais émise peut disparaître
    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: 'Seul un brouillon peut être supprimé : émettez un avoir pour annuler une facture' }, { status: 409 })
    }

    await AdminInvoice.findByIdAndDelete(id)
    await Expense.updateMany({ billedToInvoiceId: invoice._id }, { $unset: { billedToInvoiceId: 1 } })
    syncProjectFinanceSafe(invoice.projectId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/invoices:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
