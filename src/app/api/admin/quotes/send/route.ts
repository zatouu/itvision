import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminQuote from '@/lib/models/AdminQuote'
import { generateITVisionQuotePdf } from '@/lib/pdf'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => null) as any
    const id = String(body?.id || body?._id || '').trim()
    const to = String(body?.to || '').trim()

    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await connectMongoose()

    const quote = await AdminQuote.findById(id).lean() as any
    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    const recipient = to || String(quote?.client?.email || '').trim()
    if (!recipient) return NextResponse.json({ error: 'Email destinataire manquant' }, { status: 400 })

    const pdfArrayBuffer = generateITVisionQuotePdf({
      numero: String(quote.numero || ''),
      date: quote.date ? new Date(quote.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      client: {
        name: String(quote.client?.name || ''),
        address: String(quote.client?.address || ''),
        phone: String(quote.client?.phone || ''),
        email: String(quote.client?.email || ''),
        rcn: quote.client?.rcn,
        ninea: quote.client?.ninea
      },
      products: Array.isArray(quote.products)
        ? quote.products.map((p: any) => ({
            description: String(p.description || ''),
            quantity: Number(p.quantity || 0),
            unitPrice: Number(p.unitPrice || 0),
            taxable: Boolean(p.taxable),
            total: Number(p.total || 0)
          }))
        : [],
      subtotal: Number(quote.subtotal || 0),
      brsAmount: Number(quote.brsAmount || 0),
      taxAmount: Number(quote.taxAmount || 0),
      other: Number(quote.other || 0),
      total: Number(quote.total || 0),
      notes: quote.notes,
      bonCommande: quote.bonCommande,
      dateLivraison: quote.dateLivraison
    })

    const pdfBytes = Buffer.from(new Uint8Array(pdfArrayBuffer))

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const ok = await emailService.sendEmail({
      to: recipient,
      subject: `Devis ${quote.numero} - IT Vision Plus`,
      html: `
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint votre devis <strong>${quote.numero}</strong>.</p>
        <p>Merci de votre confiance.</p>
        <p><a href="${siteUrl}">${siteUrl}</a></p>
      `,
      attachments: [
        {
          filename: `Devis-${quote.numero}.pdf`,
          content: pdfBytes,
          contentType: 'application/pdf'
        }
      ]
    })

    if (ok) {
      await AdminQuote.updateOne(
        { _id: id },
        {
          $set: {
            status: quote.status === 'draft' ? 'sent' : quote.status,
            sentAt: new Date()
          }
        }
      )
    }

    return NextResponse.json({ success: ok })
  } catch (error) {
    console.error('Erreur envoi devis:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du devis' }, { status: 500 })
  }
}
