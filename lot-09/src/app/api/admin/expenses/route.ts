import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Expense from '@/lib/models/Expense'
import Project from '@/lib/models/Project'
import { requireAdminApi } from '@/lib/api-auth'
import { expenseStatusFor, nextExpenseNumero, reconcileExpensePayments } from '@/lib/finance/billing'

export const dynamic = 'force-dynamic'

function asObjectIdString(value: any): string | null {
  const s = String(value || '').trim()
  if (!s) return null
  return /^[a-fA-F0-9]{24}$/.test(s) ? s : null
}

function toDate(value: any): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

function computeAmounts(body: any) {
  const amountHT = Number(body.amountHT ?? body.amount ?? 0)
  const brsApplicable = Boolean(body.brsApplicable)
  // BRS et TVA s'excluent
  const taxRate = brsApplicable ? 0 : Number(body.taxRate ?? 0)
  const taxAmount = Math.round(amountHT * taxRate) / 100
  const amountTTC = amountHT + taxAmount

  const brsRate = Number(body.brsRate ?? 5)
  const brsThreshold = Number(body.brsThreshold ?? 25000)
  let brsAmount = 0
  if (brsApplicable && amountHT > brsThreshold) {
    brsAmount = Math.round(amountHT * brsRate) / 100
  }
  const netPayable = amountTTC - brsAmount

  return { amountHT, taxRate, taxAmount, amountTTC, brsApplicable, brsRate, brsThreshold, brsAmount, netPayable }
}

// GET: liste avec filtres
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    await connectMongoose()
    const { searchParams } = new URL(request.url)

    const filter: any = {}
    const projectId = asObjectIdString(searchParams.get('projectId'))
    if (projectId) filter.projectId = projectId
    const category = searchParams.get('category')
    if (category) filter.category = category
    const paymentStatus = searchParams.get('paymentStatus')
    if (paymentStatus) filter.paymentStatus = paymentStatus
    const startDate = toDate(searchParams.get('startDate'))
    const endDate = toDate(searchParams.get('endDate'))
    if (startDate || endDate) {
      filter.expenseDate = {}
      if (startDate) filter.expenseDate.$gte = startDate
      if (endDate) filter.expenseDate.$lte = endDate
    }

    const expenses = await Expense.find(filter)
      .sort({ expenseDate: -1, createdAt: -1 })
      .lean() as any[]

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('Erreur GET /api/admin/expenses:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des dépenses' }, { status: 500 })
  }
}

// POST: créer ou mettre à jour
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null) as any
    if (!body) return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })

    await connectMongoose()

    const id = asObjectIdString(body._id) || asObjectIdString(body.id)
    const existing = id ? await Expense.findById(id) : null
    if (id && !existing) return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 })
    const numero = existing?.numero || String(body.numero || '').trim() || await nextExpenseNumero()
    const projectId = asObjectIdString(body.projectId)

    let projectName = body.projectName
    if (projectId && !projectName) {
      const p = await Project.findById(projectId).select({ name: 1 }).lean() as any
      projectName = p?.name
    }

    const amounts = computeAmounts(body)
    // « Payée » sans montant saisi = réglée en totalité
    let paidAmount = Math.max(0, Number(body.paidAmount) || 0)
    if (body.paymentStatus === 'paid' && paidAmount <= 0) paidAmount = amounts.netPayable
    if (body.paymentStatus === 'unpaid') paidAmount = 0
    const paidAt = toDate(body.paidAt) || new Date()
    const payments = reconcileExpensePayments(existing ? existing.toObject() : null, paidAmount, paidAt, body.paymentMethod, auth.user.id)
    const paymentStatus = expenseStatusFor(body.paymentStatus, paidAmount, amounts.netPayable)

    const data: any = {
      numero,
      label: String(body.label || '').trim(),
      description: body.description,
      category: body.category || 'autre',
      subCategory: body.subCategory,
      projectId: projectId || undefined,
      projectName,
      clientCompanyId: asObjectIdString(body.clientCompanyId) || undefined,
      supplier: body.supplier || {},
      ...amounts,
      currency: body.currency || 'FCFA',
      paymentStatus,
      paymentMethod: body.paymentMethod,
      paidAmount,
      payments,
      paidAt: paidAmount > 0 ? (payments[payments.length - 1]?.date || paidAt) : undefined,
      dueDate: toDate(body.dueDate),
      isBillable: Boolean(body.isBillable),
      expenseDate: toDate(body.expenseDate) || new Date(),
      attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
      notes: body.notes,
      createdBy: existing?.createdBy || auth.user.id
    }

    if (!data.label) return NextResponse.json({ error: 'Libellé requis' }, { status: 400 })
    if (!Number.isFinite(amounts.amountTTC) || amounts.amountTTC < 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    let saved: any
    if (existing) {
      if (existing.billedToInvoiceId && Number(existing.amountHT) !== amounts.amountHT) {
        return NextResponse.json({ error: 'Dépense déjà refacturée : montant non modifiable' }, { status: 409 })
      }
      Object.assign(existing, data)
      await existing.save()
      saved = existing.toObject()
    } else {
      const created = new Expense(data)
      await created.save()
      saved = created.toObject()
    }

    return NextResponse.json({ success: true, expense: saved })
  } catch (error: any) {
    const message = error?.code === 11000 ? 'Numéro de dépense déjà utilisé' : 'Erreur lors de la sauvegarde'
    console.error('Erreur POST /api/admin/expenses:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH: marquer payée / mise à jour rapide
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null) as any
    const id = asObjectIdString(body?.id || body?._id)
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    await connectMongoose()

    const exp = await Expense.findById(id)
    if (!exp) return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 })

    if (body.paymentStatus) exp.paymentStatus = body.paymentStatus
    if (body.paymentMethod !== undefined) exp.paymentMethod = body.paymentMethod

    if (body.paidAmount !== undefined || body.paymentStatus === 'paid' || body.paymentStatus === 'unpaid') {
      const net = Number(exp.netPayable ?? exp.amountTTC) || 0
      let target = body.paidAmount !== undefined ? Math.max(0, Number(body.paidAmount) || 0) : Number(exp.paidAmount) || 0
      if (body.paymentStatus === 'paid' && body.paidAmount === undefined) target = net
      if (body.paymentStatus === 'unpaid') target = 0
      const at = toDate(body.paidAt) || new Date()
      exp.payments = reconcileExpensePayments(exp.toObject(), target, at, body.paymentMethod ?? exp.paymentMethod, auth.user.id) as any
      exp.paidAmount = target
      exp.paymentStatus = expenseStatusFor(body.paymentStatus ?? exp.paymentStatus, target, net) as any
      exp.paidAt = target > 0 ? at : undefined
    }

    await exp.save()
    const saved = exp.toObject()

    return NextResponse.json({ success: true, expense: saved })
  } catch (error) {
    console.error('Erreur PATCH /api/admin/expenses:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const id = asObjectIdString(searchParams.get('id'))
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    await connectMongoose()
    const exp = await Expense.findById(id).select('billedToInvoiceId paidAmount').lean() as any
    if (!exp) return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 })
    // Une dépense réglée ou refacturée est une trace comptable : on l'annule au lieu de la supprimer
    if (exp.billedToInvoiceId || Number(exp.paidAmount) > 0) {
      return NextResponse.json({ error: 'Dépense réglée ou refacturée : passez-la en « Annulée » plutôt que de la supprimer' }, { status: 409 })
    }
    await Expense.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/expenses:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
