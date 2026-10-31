import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AdminQuote from '@/lib/models/AdminQuote'
import emailService from '@/lib/email-service'
import { getBrandFromHost } from '@/lib/branding'
import { escapeHtml as esc } from '@/lib/html-escape'
import { notifyQuoteWorkflowEvent } from '@/lib/quote-notifications'
import { logAuditEvent } from '@/lib/audit'

/**
 * POST /api/admin/quotes/[id]/comments { message, notifyByEmail? }
 * Réponse d'IT Vision dans le fil d'échange du devis (visible au portail) ; marque les messages du client comme lus.
 * PATCH : marque seulement les messages du client comme lus.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const body = await request.json().catch(() => ({})) as any
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : ''
    if (!message) return NextResponse.json({ error: 'Le message est requis' }, { status: 400 })

    await connectMongoose()
    const quote = await AdminQuote.findById(id).select('numero title total client clientUserId clientCompanyId status').lean() as any
    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (quote.status === 'draft') return NextResponse.json({ error: "Le devis n'a pas encore été envoyé au client" }, { status: 409 })

    await AdminQuote.updateOne(
      { _id: quote._id },
      { $push: { clientComments: { authorId: auth.user.id, authorRole: 'ADMIN', message, createdAt: new Date(), readByOther: false } } }
    )
    await AdminQuote.updateOne(
      { _id: quote._id },
      { $set: { 'clientComments.$[c].readByOther': true } },
      { arrayFilters: [{ 'c.authorRole': 'CLIENT' }] }
    )
    const updated = await AdminQuote.findById(quote._id).lean() as any

    const brand = getBrandFromHost(request.nextUrl.host)
    const actor = auth.user.name || brand.name
    const tasks: Promise<unknown>[] = [
      notifyQuoteWorkflowEvent({
        eventType: 'admin_comment',
        quote: updated,
        actorName: actor,
        message,
        clientUserId: quote.clientUserId ? String(quote.clientUserId) : undefined,
        clientCompanyId: quote.clientCompanyId ? String(quote.clientCompanyId) : undefined,
      }),
    ]
    if (body?.notifyByEmail !== false && quote.client?.email) {
      const link = `${brand.url}/portail-entreprise/documents/devis/${String(quote._id)}`
      tasks.push(emailService.sendEmail({
        to: quote.client.email,
        fromName: brand.name,
        brand,
        subject: `Devis ${quote.numero} — réponse de ${brand.name}`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
          <div style="max-width:600px;margin:0 auto;padding:20px">
            <p>Bonjour ${esc(quote.client?.name || '')},</p>
            <p>${esc(brand.name)} a répondu à votre message concernant le devis <strong>${esc(quote.numero)}</strong>${quote.title ? ` (${esc(quote.title)})` : ''} :</p>
            <div style="background:#f8f9fa;border-left:4px solid #16a34a;padding:12px 16px;margin:16px 0;white-space:pre-line">${esc(message)}</div>
            <p><a href="${link}" style="display:inline-block;background:#166534;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Voir le devis et répondre</a></p>
            <p style="font-size:12px;color:#888">${esc(brand.contactEmail || '')}</p>
          </div></body></html>`,
      }))
    }
    await Promise.allSettled(tasks)

    void logAuditEvent({
      entityType: 'AdminQuote',
      entityId: quote._id,
      action: 'admin_comment',
      userId: auth.user.id,
      userRole: auth.user.role,
      metadata: { numero: quote.numero, length: message.length },
    })

    return NextResponse.json({ success: true, clientComments: updated?.clientComments || [] }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/admin/quotes/[id]/comments:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi de la réponse" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    await connectMongoose()
    await AdminQuote.updateOne(
      { _id: id },
      { $set: { 'clientComments.$[c].readByOther': true } },
      { arrayFilters: [{ 'c.authorRole': 'CLIENT' }] }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur PATCH /api/admin/quotes/[id]/comments:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
