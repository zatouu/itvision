import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Lead, { LeadSector, LeadStatus } from '@/lib/models/Lead'

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    const r = String(role || '').toUpperCase()
    if (!['ADMIN', 'SUPER_ADMIN'].includes(r)) throw new Error('Accès non autorisé')
  })
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50')))
    const sector = searchParams.get('sector') || ''
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const city = searchParams.get('city') || ''

    const filter: Record<string, unknown> = {}
    if (sector) filter.sector = sector
    if (status) filter.status = status
    if (city) filter.city = { $regex: city, $options: 'i' }
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Lead.countDocuments(filter),
    ])

    return NextResponse.json({
      leads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[LEADS API GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const body = await request.json()
    const { companyName, contactName, email, phone, website, sector, city, address, source, notes, tags } = body

    if (!companyName || !email) {
      return NextResponse.json({ error: 'Nom entreprise et email requis' }, { status: 400 })
    }

    const existing = await Lead.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'Un lead avec cet email existe déjà', lead: existing }, { status: 409 })
    }

    const lead = await Lead.create({
      companyName,
      contactName,
      email,
      phone,
      website,
      sector: sector || 'autre',
      city,
      address,
      source,
      notes,
      tags: tags || [],
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[LEADS API POST]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const lead = await Lead.findByIdAndUpdate(id, updates, { new: true })
    if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })

    return NextResponse.json({ lead })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[LEADS API PATCH]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await Lead.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[LEADS API DELETE]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
