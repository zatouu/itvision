import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Expense from '@/lib/models/Expense'
import Project from '@/lib/models/Project'
import { requireAdminApi } from '@/lib/api-auth'

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

async function generateNumero(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `DEP-${year}-`
  const last = await Expense.findOne({ numero: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select({ numero: 1 })
    .lean() as any
  const lastNumero = String(last?.numero || '')
  const m = lastNumero.match(/-(\d{3,})$/)
  const next = m?.[1] ? Number(m[1]) + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

function computeAmounts(body: any) {
  const amountHT = Number(body.amountHT ?? body.amount ?? 0)
  const taxRate = Number(body.taxRate ?? 0)
  const taxAmount = Number(body.taxAmount ?? (amountHT * taxRate / 100))
  const amountTTC = Number(body.amountTTC ?? (amountHT + taxAmount))
  return { amountHT, taxRate, taxAmount, amountTTC }
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
    const numero = String(body.numero || '').trim() || await generateNumero()
    const projectId = asObjectIdString(body.projectId)

    let projectName = body.projectName
    if (projectId && !projectName) {
      const p = await Project.findById(projectId).select({ name: 1 }).lean() as any
      projectName = p?.name
    }

    const amounts = computeAmounts(body)
    const paidAmount = Number(body.paidAmount ?? (body.paymentStatus === 'paid' ? amounts.amountTTC : 0))

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
      paymentStatus: body.paymentStatus || 'unpaid',
      paymentMethod: body.paymentMethod,
      paidAmount,
      paidAt: toDate(body.paidAt),
      dueDate: toDate(body.dueDate),
      isBillable: Boolean(body.isBillable),
      expenseDate: toDate(body.expenseDate) || new Date(),
      attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
      notes: body.notes,
      createdBy: auth.user.id
    }

    if (!data.label) return NextResponse.json({ error: 'Libellé requis' }, { status: 400 })
    if (!Number.isFinite(amounts.amountTTC) || amounts.amountTTC < 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    let saved: any
    if (id) {
      saved = await Expense.findByIdAndUpdate(id, { $set: data }, { new: true }).lean()
      if (!saved) return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 })
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

    const update: any = {}
    if (body.paymentStatus) update.paymentStatus = body.paymentStatus
    if (body.paymentMethod !== undefined) update.paymentMethod = body.paymentMethod
    if (body.paidAmount !== undefined) update.paidAmount = Number(body.paidAmount)
    if (body.paidAt !== undefined) update.paidAt = toDate(body.paidAt)

    if (body.paymentStatus === 'paid') {
      update.paidAt = update.paidAt || new Date()
      const exp = await Expense.findById(id).select({ amountTTC: 1 }).lean() as any
      if (exp && (update.paidAmount === undefined)) update.paidAmount = exp.amountTTC
    }

    const saved = await Expense.findByIdAndUpdate(id, { $set: update }, { new: true }).lean() as any
    if (!saved) return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 })

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
    await Expense.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/expenses:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
