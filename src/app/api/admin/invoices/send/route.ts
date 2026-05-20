import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { generateITVisionInvoicePdf } from '@/lib/pdf'
import { emailService } from '@/lib/email-service'
import { getClientEmailRecipients } from '@/lib/client-contacts'
import fs from 'fs'
import path from 'path'

// Helper to load image
const loadImage = (relativePath: string) => {
  try {
    const fullPath = path.join(process.cwd(), relativePath)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath).toString('base64')
    }
  } catch (e) {
    console.error(`Failed to load image ${relativePath}`, e)
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
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

    const pdfArrayBuffer = generateITVisionInvoicePdf({
      numero: String(invoice.numero || ''),
      date: invoice.date ? new Date(invoice.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : undefined,
      client: {
        name: String(invoice.client?.name || ''),
        company: invoice.client?.company ? String(invoice.client.company) : undefined,
        address: String(invoice.client?.address || ''),
        phone: String(invoice.client?.phone || ''),
        email: String(invoice.client?.email || ''),
        taxId: invoice.client?.taxId ? String(invoice.client.taxId) : undefined
      },
      items: Array.isArray(invoice.items)
        ? invoice.items.map((it: any) => ({
            description: String(it.description || ''),
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            totalPrice: Number(it.totalPrice ?? 0)
          }))
        : [],
      subtotal: Number(invoice.subtotal || 0),
      taxRate: Number(invoice.taxRate ?? 18),
      taxAmount: Number(invoice.taxAmount || 0),
      total: Number(invoice.total || 0),
      notes: invoice.notes,
      terms: invoice.terms,
      paymentMethod: invoice.paymentMethod,
      paymentDate: invoice.paymentDate,
      images: {
        logo: loadImage('public/images/logo-it-vision.png'),
        stamp: loadImage('public/images/cachetitv.png')
      }
    })

    const pdfBytes = Buffer.from(new Uint8Array(pdfArrayBuffer))

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const ok = await emailService.sendEmail({
      to: recipient,
      subject: `Facture ${invoice.numero} - IT Vision Plus`,
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
    }

    return NextResponse.json({ success: ok })
  } catch (error) {
    console.error('Erreur envoi facture:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi de la facture' }, { status: 500 })
  }
}
