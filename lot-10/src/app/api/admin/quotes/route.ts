import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { requireAdminApi } from '@/lib/api-auth'
import { computeQuoteTotals, isQuoteLocked, nextQuoteNumero, syncProjectWithQuoteDecision } from '@/lib/finance/billing'

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected']

function asObjectIdString(value: any): string | null {
  const s = String(value || '').trim()
  if (!s) return null
  return /^[a-fA-F0-9]{24}$/.test(s) ? s : null
}

async function resolveClientLinks(body: any): Promise<{ clientUserId?: string; clientCompanyId?: string }> {
  const directUserId = asObjectIdString(body?.clientUserId)
  const directCompanyId = asObjectIdString(body?.clientCompanyId)
  if (directUserId || directCompanyId) {
    return {
      clientUserId: directUserId || undefined,
      clientCompanyId: directCompanyId || undefined
    }
  }

  const email = String(body?.client?.email || '').trim().toLowerCase()
  const nameOrCompany = String(body?.client?.name || '').trim()

  const links: { clientUserId?: string; clientCompanyId?: string } = {}

  if (email) {
    const user = await User.findOne({ email }).select({ _id: 1 }).lean() as any
    if (user?._id) links.clientUserId = String(user._id)

    const client = await Client.findOne({ email }).select({ _id: 1 }).lean() as any
    if (client?._id) links.clientCompanyId = String(client._id)
  }

  if (!links.clientCompanyId && nameOrCompany) {
    const client = await Client.findOne({ $or: [{ company: nameOrCompany }, { name: nameOrCompany }] })
      .select({ _id: 1 })
      .lean() as any
    if (client?._id) links.clientCompanyId = String(client._id)
  }

  return links
}

// GET: Récupérer tous les devis
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectMongoose()
    
    // Récupérer tous les devis
    const quotes = await AdminQuote.find()
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Erreur GET /api/admin/quotes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    )
  }
}

// POST: Créer ou mettre à jour un devis
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()

    await connectMongoose()
    
    const id = asObjectIdString(body?._id) || asObjectIdString(body?.id)
    const projectId = asObjectIdString(body?.projectId)

    const existing = id ? await AdminQuote.findById(id).select('numero status').lean() as any : null
    if (id && !existing) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (existing && isQuoteLocked(existing.status)) {
      return NextResponse.json(
        { error: 'Ce devis a été accepté par le client : il ne peut plus être modifié. Créez une nouvelle version.' },
        { status: 409 }
      )
    }
    const status = body.status || existing?.status || 'draft'
    if (!QUOTE_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Statut invalide : ${status}` }, { status: 400 })
    }

    const links = await resolveClientLinks(body)

    // Montants recalculés côté serveur : le navigateur ne fait foi que pour les lignes saisies
    const totals = computeQuoteTotals(Array.isArray(body.products) ? body.products : [], {
      applyBRS: Boolean(body.applyBRS),
      brsThreshold: Number(body.brsThreshold ?? 25000),
      taxAmount: body.taxAmount,
      other: body.other,
    })

    const quoteData: any = {
      // Un numéro attribué ne change plus (référencé par factures, emails, PDF)
      numero: existing?.numero || String(body.numero || '').trim() || await nextQuoteNumero(),
      title: body.title,
      date: body.date ? new Date(body.date) : new Date(),
      client: body.client,
      products: totals.products.map(p => ({
        productId: asObjectIdString(p.productId) || undefined,
        description: p.description,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        netUnitPrice: p.netUnitPrice,
        taxable: p.taxable,
        isLabor: p.isLabor,
        total: p.total,
      })),
      subtotal: totals.subtotal,
      applyBRS: Boolean(body.applyBRS),
      brsThreshold: Number(body.brsThreshold ?? 25000),
      brsAmount: totals.brsAmount,
      taxAmount: totals.taxAmount,
      other: totals.other,
      total: totals.total,
      status,
      notes: body.notes,
      bonCommande: body.bonCommande,
      dateLivraison: body.dateLivraison,
      conditions: body.conditions,
      createdBy: auth.user.id,
      projectId: projectId || undefined,
      clientUserId: links.clientUserId,
      clientCompanyId: links.clientCompanyId,
      attachments: Array.isArray(body.attachments) ? body.attachments : undefined
    }

    let quote: any
    if (id) {
      quote = await AdminQuote.findByIdAndUpdate(id, { $set: quoteData }, { new: true, runValidators: true }).lean()
      if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    } else {
      const created = new AdminQuote(quoteData)
      await created.save()
      quote = created.toObject()
    }

    // Décision enregistrée par l'admin (accord téléphonique, bon de commande papier...) : même effet que côté portail
    if ((status === 'accepted' || status === 'rejected') && existing?.status !== status) {
      if (status === 'accepted' && !quote.acceptedAt) {
        await AdminQuote.updateOne({ _id: quote._id }, { $set: { acceptedAt: new Date() } })
      }
      await syncProjectWithQuoteDecision(quote, status, auth.user.email || 'Admin').catch((err) =>
        console.error('Synchro projet après décision devis:', err)
      )
    }

    return NextResponse.json({ success: true, quote })
  } catch (error: any) {
    console.error('Erreur POST /api/admin/quotes:', error)
    return NextResponse.json(
      { error: error?.code === 11000 ? 'Numéro de devis déjà utilisé' : 'Erreur lors de la sauvegarde du devis' },
      { status: error?.code === 11000 ? 409 : 500 }
    )
  }
}

// DELETE: Supprimer un devis
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('id')

    if (!quoteId) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    await connectMongoose()

    const quote = await AdminQuote.findById(quoteId).select('status').lean() as any
    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (isQuoteLocked(quote.status)) {
      return NextResponse.json({ error: 'Un devis accepté ne peut pas être supprimé' }, { status: 409 })
    }
    const invoiced = await AdminInvoice.exists({ quoteId: String(quoteId), status: { $ne: 'cancelled' } })
    if (invoiced) {
      return NextResponse.json({ error: 'Ce devis est lié à une facture : il ne peut pas être supprimé' }, { status: 409 })
    }

    await AdminQuote.findByIdAndDelete(quoteId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/quotes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du devis' },
      { status: 500 }
    )
  }
}

