import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import CreditNote from '@/lib/models/CreditNote'
import { invoiceBalance, OPEN_INVOICE_STATUSES } from '@/lib/finance/billing'
import { syncProjectFinanceSafe } from '@/lib/finance/project-finance'
import { logAuditEvent } from '@/lib/audit'
import { notifyCompany } from '@/lib/portal/company-notify'

function toDate(value: unknown): Date | null {
  if (!value) return new Date()
  const d = new Date(String(value))
  return isNaN(d.getTime()) ? null : d
}

/**
 * POST /api/admin/invoices/[id]/payments { amount, date?, method?, reference?, note? }
 * Enregistre un acompte ou le solde ; la facture passe "partiellement payée" ou "payée".
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const body = await request.json().catch(() => ({})) as any
    const amount = Math.round(Number(body?.amount) || 0)
    const date = toDate(body?.date)
    if (amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    if (!date || date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Date de paiement invalide' }, { status: 400 })
    }

    await connectMongoose()
    const invoice = await AdminInvoice.findById(id).select('numero status total amountPaid creditedAmount updatedAt paidAt clientCompanyId').lean() as any
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (!OPEN_INVOICE_STATUSES.includes(invoice.status)) {
      return NextResponse.json({ error: 'Seule une facture émise et non soldée peut recevoir un paiement' }, { status: 409 })
    }

    const balance = invoiceBalance(invoice)
    if (amount > balance) {
      return NextResponse.json({ error: `Le montant dépasse le reste dû (${balance.toLocaleString('fr-FR')} FCFA)` }, { status: 400 })
    }

    const settled = amount === balance
    const payment = {
      amount,
      date,
      method: typeof body?.method === 'string' && body.method.trim() ? body.method.slice(0, 50) : 'Virement',
      reference: typeof body?.reference === 'string' ? body.reference.slice(0, 100) : undefined,
      note: typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined,
      recordedBy: auth.user.id,
    }
    const set: Record<string, unknown> = { status: settled ? 'paid' : 'partial' }
    if (settled) {
      set.paidAt = date
      set.paymentDate = date.toISOString().slice(0, 10)
      if (payment.method) set.paymentMethod = payment.method
    }

    // Verrou optimiste : deux paiements simultanés ne peuvent pas dépasser le reste dû
    const saved = await AdminInvoice.findOneAndUpdate(
      { _id: invoice._id, updatedAt: invoice.updatedAt },
      { $push: { payments: payment }, $inc: { amountPaid: amount }, $set: set },
      { new: true }
    ).lean() as any
    if (!saved) return NextResponse.json({ error: 'La facture a été modifiée entre-temps, rechargez' }, { status: 409 })
    syncProjectFinanceSafe(saved.projectId)

    void logAuditEvent({
      entityType: 'AdminInvoice',
      entityId: invoice._id,
      action: settled ? 'payment_settled' : 'payment_partial',
      userId: auth.user.id,
      userRole: auth.user.role,
      metadata: { numero: invoice.numero, amount, balanceAfter: invoiceBalance(saved) },
    })

    if (invoice.clientCompanyId) {
      void notifyCompany({
        companyId: invoice.clientCompanyId,
        category: 'payment',
        type: 'success',
        requires: 'finance:view',
        title: settled ? `Facture ${invoice.numero} réglée` : `Paiement reçu sur ${invoice.numero}`,
        message: settled
          ? `Merci : votre règlement de ${amount.toLocaleString('fr-FR')} FCFA solde la facture.`
          : `Merci : ${amount.toLocaleString('fr-FR')} FCFA enregistrés, reste ${invoiceBalance(saved).toLocaleString('fr-FR')} FCFA.`,
        actionUrl: `/portail-entreprise/documents/factures/${String(invoice._id)}`,
        metadata: { invoiceId: String(invoice._id) },
      })
    }

    return NextResponse.json({
      success: true,
      status: saved.status,
      amountPaid: saved.amountPaid,
      balance: invoiceBalance(saved),
      payments: saved.payments,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/admin/invoices/[id]/payments:', error)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du paiement" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/invoices/[id]/payments?paymentId=…&reason=…
 * Annule un paiement saisi par erreur ; le statut de la facture est recalculé.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId') || ''
    const reason = (searchParams.get('reason') || '').trim().slice(0, 300)
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    if (!reason) return NextResponse.json({ error: "Le motif de l'annulation est obligatoire" }, { status: 400 })

    await connectMongoose()
    const invoice = await AdminInvoice.findById(id).select('numero status total amountPaid creditedAmount dueDate payments updatedAt').lean() as any
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (invoice.status === 'cancelled') return NextResponse.json({ error: 'Facture annulée' }, { status: 409 })
    const payment = (invoice.payments || []).find((p: any) => String(p._id) === paymentId)
    if (!payment) return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
    if (await CreditNote.exists({ invoiceId: invoice._id, refundAmount: { $gt: 0 } })) {
      return NextResponse.json({ error: 'Un avoir avec remboursement s’appuie sur ces paiements : annulation impossible' }, { status: 409 })
    }

    const amountPaid = Math.max(0, (Number(invoice.amountPaid) || 0) - (Number(payment.amount) || 0))
    const netDue = (Number(invoice.total) || 0) - (Number(invoice.creditedAmount) || 0)
    const overdue = invoice.dueDate && new Date(invoice.dueDate) < new Date()
    const status = amountPaid >= netDue ? 'paid' : amountPaid > 0 ? 'partial' : overdue ? 'overdue' : 'sent'

    const update: any = { $pull: { payments: { _id: payment._id } }, $set: { amountPaid, status } }
    if (status !== 'paid') update.$unset = { paidAt: 1, paymentDate: 1 }

    const saved = await AdminInvoice.findOneAndUpdate({ _id: invoice._id, updatedAt: invoice.updatedAt }, update, { new: true }).lean() as any
    if (!saved) return NextResponse.json({ error: 'La facture a été modifiée entre-temps, rechargez' }, { status: 409 })

    void logAuditEvent({
      entityType: 'AdminInvoice',
      entityId: invoice._id,
      action: 'payment_cancelled',
      userId: auth.user.id,
      userRole: auth.user.role,
      metadata: { numero: invoice.numero, amount: payment.amount, date: payment.date, reason },
    })

    syncProjectFinanceSafe(saved.projectId)
    return NextResponse.json({ success: true, status: saved.status, amountPaid: saved.amountPaid, balance: invoiceBalance(saved) })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/invoices/[id]/payments:', error)
    return NextResponse.json({ error: "Erreur lors de l'annulation du paiement" }, { status: 500 })
  }
}
