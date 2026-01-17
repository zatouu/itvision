import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Quote from '@/lib/models/Quote'
import { requireAuth } from '@/lib/jwt'

async function requireQuoteAccess(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = ['ADMIN', 'PRODUCT_MANAGER', 'TECHNICIAN'].includes(role)
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const, role }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
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
    if (status) query.status = status
    if (clientId) query.clientId = clientId
    const items = await Quote.find(query).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, items })
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
    const { clientId, serviceCode, products, notes, currency } = body || {}
    if (!clientId || !serviceCode || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ success: false, error: 'Champs requis manquants' }, { status: 400 })
    }
    const subtotal = products.reduce((s: number, p: any) => s + (p.unitPrice * p.quantity), 0)
    const marginTotal = products.reduce((s: number, p: any) => s + ((p.marginRate || 0) * p.unitPrice * p.quantity), 0)
    const totalHT = subtotal + marginTotal
    const totalTTC = totalHT // TVA à ajouter plus tard si nécessaire
    const created = await Quote.create({
      clientId,
      serviceCode: String(serviceCode).toUpperCase(),
      status: 'draft',
      products: products.map((p: any) => ({
        productId: p.productId,
        name: p.name,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        marginRate: p.marginRate || 0,
        totalPrice: (p.unitPrice * p.quantity) + ((p.marginRate || 0) * p.unitPrice * p.quantity)
      })),
      subtotal,
      marginTotal,
      totalHT,
      totalTTC,
      currency: (currency === 'FCFA' || currency === 'EUR' || currency === 'USD' || currency === 'CNY') 
        ? currency 
        : 'FCFA',
      notes
    })
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur création devis' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireQuoteAccess(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { id, ...data } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 })
    await Quote.updateOne({ _id: id }, { $set: data })
    const updated = await Quote.findById(id).lean()
    return NextResponse.json({ success: true, item: updated })
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
    await Quote.deleteOne({ _id: id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur suppression' }, { status: 500 })
  }
}


