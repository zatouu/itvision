import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ADMIN_ROLES, authErrorResponse, requireApiUser } from '@/lib/api-auth'
import { projectsCollection, updateProjectFields } from '@/lib/projects/persistence'
import AdminQuote from '@/lib/models/AdminQuote'
import Expense from '@/lib/models/Expense'
import { nextExpenseNumero, reconcileExpensePayments } from '@/lib/finance/billing'

export const dynamic = 'force-dynamic'

const linesOf = async (id: string) => {
  const p = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { budgetLines: 1, name: 1 } }) as any
  return p ? { project: p, lines: (p.budgetLines || []) as any[] } : null
}

/** GET /api/projects/[id]/budget — budget prévisionnel (admin uniquement : prix d'achat internes). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiUser(request, [...ADMIN_ROLES, 'ACCOUNTANT'])
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 })
    await connectMongoose()
    const data = await linesOf(id)
    if (!data) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    return NextResponse.json({ success: true, lines: data.lines })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    return NextResponse.json({ error: 'Erreur de chargement du budget' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/budget
 *  { action: 'import', quoteId }                                  → préremplit depuis un devis accepté
 *  { action: 'purchase', lineId, actualUnitCost, paymentStatus? } → crée la dépense réelle, ligne « achetée »
 *  { action: 'cancel' | 'restore', lineId }                       → ligne non nécessaire / remise en prévision
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request, ADMIN_ROLES)
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 })
    const body = await request.json().catch(() => ({})) as any
    await connectMongoose()
    const data = await linesOf(id)
    if (!data) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    let lines = data.lines

    if (body.action === 'import') {
      const quote = mongoose.isValidObjectId(body.quoteId)
        ? await AdminQuote.findOne({ _id: body.quoteId, projectId: id, status: 'accepted' }).lean() as any
        : null
      if (!quote) return NextResponse.json({ error: 'Devis accepté introuvable pour ce projet' }, { status: 404 })
      if (lines.some(l => l.quoteId === String(quote._id))) return NextResponse.json({ error: 'Budget déjà importé pour ce devis' }, { status: 409 })
      lines = [...lines, ...(quote.products || []).map((p: any) => ({
        id: new mongoose.Types.ObjectId().toString(),
        quoteId: String(quote._id),
        label: String(p.description || '').slice(0, 200),
        quantity: Number(p.quantity) || 1,
        unitCost: Number(p.unitCost) || 0,
        unitPrice: Number(p.netUnitPrice ?? p.unitPrice) || 0,
        isLabor: !!p.isLabor,
        status: 'planned',
      }))]
    } else {
      const idx = lines.findIndex(l => l.id === String(body.lineId))
      if (idx < 0) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 })
      const line = { ...lines[idx] }

      if (body.action === 'purchase') {
        if (line.status === 'purchased') return NextResponse.json({ error: 'Achat déjà confirmé' }, { status: 409 })
        const unit = Number(body.actualUnitCost)
        if (!Number.isFinite(unit) || unit < 0) return NextResponse.json({ error: 'Prix réel invalide' }, { status: 400 })
        const quantity = Number(line.quantity) || 1
        const amount = Math.round(unit * quantity)
        const paid = body.paymentStatus === 'paid'
        const now = new Date()
        const expense = await Expense.create({
          payments: paid ? reconcileExpensePayments(null, amount, now, undefined, String(user.userId)) : [],
          numero: await nextExpenseNumero(),
          label: `${quantity} × ${line.label}`.slice(0, 200),
          category: line.isLabor ? 'salaire' : 'achat_materiel',
          projectId: id,
          projectName: data.project.name,
          amountHT: amount, taxRate: 0, taxAmount: 0, amountTTC: amount, netPayable: amount,
          currency: 'FCFA',
          paymentStatus: paid ? 'paid' : 'unpaid',
          paidAmount: paid ? amount : 0,
          paidAt: paid ? new Date() : undefined,
          expenseDate: new Date(),
          notes: `Budget prévisionnel : estimé ${Math.round((Number(line.unitCost) || 0) * quantity)} F, revendu ${Math.round((Number(line.unitPrice) || 0) * quantity)} F`,
          createdBy: user.userId,
        })
        Object.assign(line, { status: 'purchased', actualUnitCost: unit, expenseId: String(expense._id), purchasedAt: new Date() })
      } else if (body.action === 'cancel') {
        if (line.status === 'purchased') return NextResponse.json({ error: 'Achat confirmé : supprimez d’abord la dépense' }, { status: 409 })
        line.status = 'cancelled'
      } else if (body.action === 'restore') {
        if (line.status === 'purchased' && line.expenseId && await Expense.exists({ _id: line.expenseId })) {
          return NextResponse.json({ error: 'La dépense existe toujours : supprimez-la d’abord' }, { status: 409 })
        }
        Object.assign(line, { status: 'planned', actualUnitCost: undefined, expenseId: undefined, purchasedAt: undefined })
      } else {
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
      }
      lines = lines.map((l, i) => (i === idx ? line : l))
    }

    await updateProjectFields(id, { budgetLines: lines })
    return NextResponse.json({ success: true, lines })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('POST /api/projects/[id]/budget:', error)
    return NextResponse.json({ error: 'Opération impossible' }, { status: 500 })
  }
}
