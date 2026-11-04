import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import CreditNote from '@/lib/models/CreditNote'
import { nextCreditNoteNumero } from '@/lib/finance/billing'
import { syncProjectFinanceSafe } from '@/lib/finance/project-finance'
import { withOptionalTransaction } from '@/lib/mongo-transaction'
import { logAuditEvent } from '@/lib/audit'
import { notifyCompany } from '@/lib/portal/company-notify'

const CREDITABLE = ['sent', 'overdue', 'partial', 'paid']

/**
 * POST /api/admin/invoices/[id]/credit-note { reason, amount? }
 * Avoir total (sans montant) ou partiel. La facture est annulée si elle n'a rien encaissé et est
 * entièrement créditée ; un trop-perçu éventuel est porté sur l'avoir comme remboursement à faire.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const body = await request.json().catch(() => ({})) as any
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
    if (!reason) return NextResponse.json({ error: "Le motif de l'avoir est obligatoire" }, { status: 400 })

    await connectMongoose()
    const invoice = await AdminInvoice.findById(id).lean() as any
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (!CREDITABLE.includes(invoice.status)) {
      return NextResponse.json({ error: 'Seule une facture émise peut faire l’objet d’un avoir (un brouillon se modifie ou se supprime)' }, { status: 409 })
    }

    const total = Math.round(Number(invoice.total) || 0)
    const alreadyCredited = Math.round(Number(invoice.creditedAmount) || 0)
    const creditable = total - alreadyCredited
    if (creditable <= 0) return NextResponse.json({ error: 'Facture déjà entièrement créditée' }, { status: 409 })

    const amount = body?.amount == null || body.amount === '' ? creditable : Math.round(Number(body.amount) || 0)
    if (amount <= 0 || amount > creditable) {
      return NextResponse.json({ error: `Montant invalide (maximum ${creditable.toLocaleString('fr-FR')} FCFA)` }, { status: 400 })
    }

    const isFullOriginal = alreadyCredited === 0 && amount === total
    const amountPaid = Math.round(Number(invoice.amountPaid) || 0)
    const creditedAfter = alreadyCredited + amount
    const netDue = total - creditedAfter
    const refundAmount = Math.max(0, amountPaid - netDue)

    // Statut de la facture après l'avoir
    let nextStatus = invoice.status
    if (netDue <= 0 && amountPaid === 0) nextStatus = 'cancelled'
    else if (amountPaid >= netDue) nextStatus = 'paid'

    const creditNoteId = new mongoose.Types.ObjectId()
    const invoiceSet: Record<string, unknown> = { status: nextStatus }
    if (nextStatus === 'paid' && !invoice.paidAt) invoiceSet.paidAt = new Date()

    const creditNote = await withOptionalTransaction(async (session) => {
      // Verrou optimiste : la facture ne doit pas avoir changé depuis la lecture
      const claimed = await AdminInvoice.updateOne(
        { _id: invoice._id, updatedAt: invoice.updatedAt },
        { $inc: { creditedAmount: amount }, $push: { creditNoteIds: creditNoteId }, $set: invoiceSet },
        { session }
      )
      if (claimed.modifiedCount === 0) return null
      const [created] = await CreditNote.create([{
        _id: creditNoteId,
        numero: await nextCreditNoteNumero(),
        invoiceId: invoice._id,
        invoiceNumero: invoice.numero,
        date: new Date(),
        reason,
        items: isFullOriginal
          ? (invoice.items || []).map((it: any) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, totalPrice: it.totalPrice }))
          : [{ description: `Avoir sur facture ${invoice.numero} — ${reason}`, quantity: 1, unitPrice: amount, totalPrice: amount }],
        subtotal: isFullOriginal ? invoice.subtotal : amount,
        brsAmount: isFullOriginal ? invoice.brsAmount || 0 : 0,
        taxAmount: isFullOriginal ? invoice.taxAmount || 0 : 0,
        total: amount,
        client: {
          name: invoice.client?.name || 'Client',
          company: invoice.client?.company,
          email: invoice.client?.email,
          phone: invoice.client?.phone,
          address: invoice.client?.address,
          taxId: invoice.client?.taxId,
        },
        clientUserId: invoice.clientUserId,
        clientCompanyId: invoice.clientCompanyId,
        projectId: invoice.projectId,
        refundAmount,
        refundStatus: refundAmount > 0 ? 'pending' : 'none',
        createdBy: auth.user.id,
      }], { session })
      return created
    })
    if (!creditNote) {
      return NextResponse.json({ error: 'La facture a été modifiée entre-temps, rechargez' }, { status: 409 })
    }
    syncProjectFinanceSafe(invoice.projectId)

    void logAuditEvent({
      entityType: 'CreditNote',
      entityId: creditNote._id,
      action: 'created',
      userId: auth.user.id,
      userRole: auth.user.role,
      metadata: { numero: creditNote.numero, invoice: invoice.numero, amount, refundAmount, invoiceStatus: nextStatus },
    })

    if ((invoice as any).clientCompanyId) {
      void notifyCompany({
        companyId: (invoice as any).clientCompanyId,
        category: 'invoice',
        requires: 'finance:view',
        title: `Avoir ${creditNote.numero} sur la facture ${invoice.numero}`,
        message: `${amount.toLocaleString('fr-FR')} FCFA déduits${refundAmount > 0 ? `, dont ${refundAmount.toLocaleString('fr-FR')} FCFA à vous rembourser` : ''}.`,
        actionUrl: `/portail-entreprise/documents/factures/${String(invoice._id)}`,
        metadata: { invoiceId: String(invoice._id), creditNoteId: String(creditNote._id) },
      })
    }

    return NextResponse.json({
      success: true,
      creditNote: creditNote.toObject(),
      invoiceStatus: nextStatus,
      refundAmount,
    }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/admin/invoices/[id]/credit-note:', error)
    return NextResponse.json({ error: "Erreur lors de la création de l'avoir" }, { status: 500 })
  }
}
