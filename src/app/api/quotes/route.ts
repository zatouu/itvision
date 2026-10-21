import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AdminQuote from '@/lib/models/AdminQuote'
import Client from '@/lib/models/Client'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import { generateQuoteNumero } from '@/lib/quote-number'

// Le modèle legacy Quote a été fusionné dans AdminQuote.
// Cette route conserve le contrat historique ({ items } avec serviceCode/totalTTC)
// pour les consommateurs existants (dashboard admin, EnhancedProjectManager).

async function requireQuoteAccess(request: NextRequest) {
  try {
    const { role, userId } = await requireAuth(request)
    const allowed = ['ADMIN', 'PRODUCT_MANAGER', 'TECHNICIAN'].includes(role)
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const, userId: null }
    return { ok: true as const, role, userId }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const, userId: null }
  }
}

// Traduction statut legacy ↔ AdminQuote (enum canonique : draft|sent|accepted|rejected)
const toCanonicalStatus = (s: string) => (s === 'approved' ? 'accepted' : s)
const toLegacyStatus = (s: string) => (s === 'accepted' ? 'approved' : s)

function toLegacyQuote(q: any) {
  return {
    ...q,
    clientId: q.clientCompanyId || q.clientUserId,
    serviceCode: q.title || q.numero,
    totalHT: q.subtotal,
    totalTTC: q.total,
    status: toLegacyStatus(q.status)
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireQuoteAccess(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const clientId = searchParams.get('clientId') || undefined
    const query: any = {}
    if (status) query.status = toCanonicalStatus(status)
    if (clientId) query.$or = [{ clientCompanyId: clientId }, { clientUserId: clientId }]
    const items = await AdminQuote.find(query).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, items: items.map(toLegacyQuote) })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur chargement devis' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireQuoteAccess(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { clientId, serviceCode, products, notes } = body || {}
    if (!clientId || !serviceCode || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ success: false, error: 'Champs requis manquants' }, { status: 400 })
    }

    // Résoudre le client (Client entreprise d'abord, User ensuite)
    const clientDoc = await Client.findById(clientId).select('name email phone address company').lean() as any
    const userDoc = clientDoc ? null : await User.findById(clientId).select('name email phone').lean() as any
    if (!clientDoc && !userDoc) {
      return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 400 })
    }

    // Prix unitaire marge incluse par ligne
    const lines = products.map((p: any) => {
      const effectiveUnit = Math.round(Number(p.unitPrice || 0) * (1 + (Number(p.marginRate) || 0) / 100))
      const quantity = Number(p.quantity) || 1
      return {
        productId: p.productId || undefined,
        description: String(p.name || p.description || ''),
        quantity,
        unitPrice: effectiveUnit,
        taxable: true,
        total: effectiveUnit * quantity
      }
    })
    const totalHT = lines.reduce((s: number, l: any) => s + l.total, 0)

    const created = await AdminQuote.create({
      numero: await generateQuoteNumero(),
      title: String(serviceCode).toUpperCase(),
      date: new Date(),
      client: {
        name: clientDoc?.company || clientDoc?.name || userDoc?.name || 'Client',
        address: clientDoc?.address || '',
        phone: clientDoc?.phone || userDoc?.phone || '',
        email: clientDoc?.email || userDoc?.email || ''
      },
      clientCompanyId: clientDoc ? clientId : undefined,
      clientUserId: userDoc ? clientId : undefined,
      products: lines,
      subtotal: totalHT,
      taxAmount: 0,
      total: totalHT,
      status: 'draft',
      notes,
      createdBy: auth.userId ? String(auth.userId) : undefined
    })
    return NextResponse.json({ success: true, item: toLegacyQuote(created.toObject()) }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur création devis' }, { status: 500 })
  }
}

const PATCH_WHITELIST = ['status', 'notes', 'bonCommande', 'dateLivraison', 'conditions', 'products', 'subtotal', 'taxAmount', 'other', 'total', 'title'] as const

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireQuoteAccess(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { id, ...data } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 })
    const update: any = {}
    for (const key of PATCH_WHITELIST) {
      if (data[key] !== undefined) update[key] = key === 'status' ? toCanonicalStatus(String(data[key])) : data[key]
    }
    await AdminQuote.updateOne({ _id: id }, { $set: update })
    const updated = await AdminQuote.findById(id).lean()
    if (!updated) return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 })
    return NextResponse.json({ success: true, item: toLegacyQuote(updated) })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireQuoteAccess(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 })
    await AdminQuote.deleteOne({ _id: id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur suppression' }, { status: 500 })
  }
}
