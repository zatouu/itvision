import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { requireAdminApi } from '@/lib/api-auth'

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

    const links = await resolveClientLinks(body)

    const quoteData: any = {
      numero: body.numero,
      date: body.date ? new Date(body.date) : new Date(),
      client: body.client,
      products: body.products,
      subtotal: body.subtotal,
      brsAmount: body.brsAmount,
      taxAmount: body.taxAmount,
      other: body.other || 0,
      total: body.total,
      status: body.status || 'draft',
      notes: body.notes,
      bonCommande: body.bonCommande,
      dateLivraison: body.dateLivraison,
      conditions: body.conditions,
      createdBy: auth.user.id,
      projectId: projectId || undefined,
      clientUserId: links.clientUserId,
      clientCompanyId: links.clientCompanyId
    }

    let quote: any
    if (id) {
      quote = await AdminQuote.findByIdAndUpdate(id, { $set: quoteData }, { new: true }).lean()
      if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    } else {
      const created = new AdminQuote(quoteData)
      await created.save()
      quote = created.toObject()
    }

    return NextResponse.json({ success: true, quote })
  } catch (error) {
    console.error('Erreur POST /api/admin/quotes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du devis' },
      { status: 500 }
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

