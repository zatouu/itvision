import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { renderInvoicePdf } from '@/lib/pdf-documents'
import { emailService } from '@/lib/email-service'
import { getClientEmailRecipients } from '@/lib/client-contacts'
import { getBrandFromHost } from '@/lib/branding'
import { notifyCompany } from '@/lib/portal/company-notify'

export async function POST(request: NextRequest) {
  try {
    const brand = getBrandFromHost(request.nextUrl.host)
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null) as any
    const id = String(body?.id || body?._id || '').trim()
    const to = String(body?.to || '').trim()
    const recipients = Array.isArray(body?.recipients)
      ? body.recipients.filter((r: string) => r && r.includes('@'))
      : []

    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await connectMongoose()

    const invoice = await AdminInvoice.findById(id).lean() as any
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Facture annulée : envoyez plutôt l’avoir correspondant' }, { status: 409 })
    }

    // Résoudre les emails contacts du client
    let recipient = to
    if (recipients.length > 0) {
      recipient = recipients.join(', ')
    } else if (!recipient && invoice.clientCompanyId) {
      recipient = await getClientEmailRecipients(String(invoice.clientCompanyId), String(invoice?.client?.email || ''))
    }
    if (!recipient) {
      recipient = String(invoice?.client?.email || '').trim()
    }
    if (!recipient) return NextResponse.json({ error: 'Email destinataire manquant' }, { status: 400 })

    const pdfBytes = renderInvoicePdf(invoice)

    const siteUrl = brand.url

    const delivery = await emailService.sendEmailDetailed({
      to: recipient,
      fromName: brand.name,
      brand,
      subject: `Facture ${invoice.numero} - ${brand.name}`,
      html: `
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint votre facture <strong>${invoice.numero}</strong>.</p>
        <p>Merci de votre confiance.</p>
        <p><a href="${siteUrl}">${siteUrl}</a></p>
      `,
      attachments: [
        {
          filename: `Facture-${invoice.numero}.pdf`,
          content: pdfBytes,
          contentType: 'application/pdf'
        }
      ]
    })
    const ok = delivery.ok

    if (ok) {
      await AdminInvoice.updateOne(
        { _id: id },
        {
          $set: {
            status: invoice.status === 'draft' ? 'sent' : invoice.status,
            sentAt: new Date()
          }
        }
      )
      if (invoice.clientCompanyId) {
        await notifyCompany({
          companyId: invoice.clientCompanyId,
          category: 'invoice',
          requires: 'finance:view',
          title: `Nouvelle facture ${invoice.numero}`,
          message: `${Math.round(Number(invoice.total) || 0).toLocaleString('fr-FR')} FCFA${invoice.dueDate ? `, échéance le ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}` : ''}.`,
          actionUrl: `/portail-entreprise/documents/factures/${String(invoice._id)}`,
          metadata: { invoiceId: String(invoice._id) },
        })
      }
    }

    return NextResponse.json({ success: ok, delivery: delivery.status, to: recipient, copyTo: delivery.bcc })
  } catch (error) {
    console.error('Erreur envoi facture:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi de la facture' }, { status: 500 })
  }
}
