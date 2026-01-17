import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Service from '@/lib/models/Service'
import { requireAuth } from '@/lib/jwt'

async function requireAdmin(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('search') || '').trim()
    const isActive = searchParams.get('active')
    const query: any = {}
    if (q) query.$or = [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }]
    if (isActive !== null) query.isActive = isActive === 'true'
    const items = await Service.find(query).sort({ name: 1 }).lean()
    return NextResponse.json({ success: true, items })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur chargement services' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { name, code, description, provider, isActive } = body || {}
    if (!name || !code) return NextResponse.json({ success: false, error: 'Champs requis manquants' }, { status: 400 })
    const exists = await Service.findOne({ code: code.toUpperCase() }).lean()
    if (exists) return NextResponse.json({ success: false, error: 'Code déjà utilisé' }, { status: 409 })
    const created = await Service.create({ name, code: code.toUpperCase(), description, provider, isActive })
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur création service' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { id, ...data } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 })
    await Service.updateOne({ _id: id }, { $set: data })
    const updated = await Service.findById(id).lean()
    return NextResponse.json({ success: true, item: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 })
    await Service.deleteOne({ _id: id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Erreur suppression' }, { status: 500 })
  }
}


