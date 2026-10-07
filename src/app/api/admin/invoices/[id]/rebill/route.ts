import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Expense from '@/lib/models/Expense'
import { computeInvoiceTotals, inferInvoiceRegime } from '@/lib/finance/billing'

/** Frais refacturables d'un même projet ou client, pas encore facturés. */
async function rebillableFor(invoice: any) {
  const scope: Record<string, unknown>[] = []
  if (invoice.projectId) scope.push({ projectId: invoice.projectId })
  if (invoice.clientCompanyId) scope.push({ clientCompanyId: invoice.clientCompanyId })
  if (scope.length === 0) return []
  return Expense.find({
    isBillable: true,
    billedToInvoiceId: { $exists: false },
    paymentStatus: { $ne: 'cancelled' },
    $or: scope,
  }).select('numero label amountHT amountTTC expenseDate projectName category').sort({ expenseDate: 1 }).lean()
}

async function loadInvoice(request: NextRequest, params: Promise<{ id: string }>) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
  if (!auth.ok) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: NextResponse.json({ error: 'ID invalide' }, { status: 400 }) }
  await connectMongoose()
  const invoice = await AdminInvoice.findById(id).lean() as any
  if (!invoice) return { error: NextResponse.json({ error: 'Facture introuvable' }, { status: 404 }) }
  return { invoice }
}

// GET /api/admin/invoices/[id]/rebill — dépenses refacturables proposées pour cette facture
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await loadInvoice(request, params)
  if (r.error) return r.error
  return NextResponse.json({ expenses: await rebillableFor(r.invoice) })
}

/**
 * POST /api/admin/invoices/[id]/rebill { expenseIds }
 * Ajoute les frais à une facture brouillon (au coût HT, ligne "fourniture" hors BRS)
 * et les marque facturés pour qu'ils ne soient pas refacturés deux fois.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await loadInvoice(request, params)
    if (r.error) return r.error
    const invoice = r.invoice
    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: 'Les frais ne s’ajoutent qu’à une facture brouillon' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({})) as any
    const requested = (Array.isArray(body?.expenseIds) ? body.expenseIds : [])
      .map(String)
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
    const allowed = new Map((await rebillableFor(invoice)).map((e: any) => [String(e._id), e]))
    const ids = requested.filter((id: string) => allowed.has(id))
    if (ids.length === 0) return NextResponse.json({ error: 'Aucune dépense refacturable sélectionnée' }, { status: 400 })

    // Réservation : une dépense ne peut être rattachée qu'à une facture
    const claimed = await Expense.updateMany(
      { _id: { $in: ids }, billedToInvoiceId: { $exists: false } },
      { $set: { billedToInvoiceId: invoice._id } }
    )
    const claimedExpenses = await Expense.find({ _id: { $in: ids }, billedToInvoiceId: invoice._id }).lean() as any[]
    if (claimed.modifiedCount === 0 || claimedExpenses.length === 0) {
      return NextResponse.json({ error: 'Dépenses déjà refacturées entre-temps' }, { status: 409 })
    }

    const newItems = claimedExpenses.map(e => ({
      description: `Refacturation : ${e.label} (${e.numero})`,
      quantity: 1,
      unitPrice: Math.round(Number(e.amountHT) || 0),
      netUnitPrice: Math.round(Number(e.amountHT) || 0),
      category: 'products',
      expenseId: String(e._id),
    }))
    const totals = computeInvoiceTotals([...(invoice.items || []), ...newItems], {
      taxRegime: inferInvoiceRegime(invoice),
      taxRate: invoice.taxRate,
      brsThreshold: invoice.brsThreshold,
    })

    const saved = await AdminInvoice.findOneAndUpdate(
      { _id: invoice._id, status: 'draft', updatedAt: invoice.updatedAt },
      { $set: { items: totals.items, subtotal: totals.subtotal, taxAmount: totals.taxAmount, brsAmount: totals.brsAmount, total: totals.total } },
      { new: true }
    ).lean()
    if (!saved) {
      await Expense.updateMany({ _id: { $in: claimedExpenses.map(e => e._id) }, billedToInvoiceId: invoice._id }, { $unset: { billedToInvoiceId: 1 } })
      return NextResponse.json({ error: 'La facture a été modifiée entre-temps, rechargez' }, { status: 409 })
    }

    return NextResponse.json({ success: true, added: newItems.length, total: totals.total })
  } catch (error) {
    console.error('Erreur POST /api/admin/invoices/[id]/rebill:', error)
    return NextResponse.json({ error: 'Erreur lors de la refacturation' }, { status: 500 })
  }
}
