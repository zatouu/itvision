import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Lead from '@/lib/models/Lead'

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    const r = String(role || '').toUpperCase()
    if (!['ADMIN', 'SUPER_ADMIN'].includes(r)) throw new Error('Accès non autorisé')
  })
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const body = await request.json()
    const { leads } = body as { leads: Array<Record<string, string>> }

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Tableau de leads requis' }, { status: 400 })
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const item of leads) {
      if (!item.companyName || !item.email) {
        skipped++
        continue
      }
      try {
        const existing = await Lead.findOne({ email: item.email.toLowerCase() })
        if (existing) {
          skipped++
          continue
        }
        await Lead.create({
          companyName: item.companyName,
          contactName: item.contactName || '',
          email: item.email,
          phone: item.phone || '',
          website: item.website || '',
          sector: item.sector || 'autre',
          city: item.city || '',
          address: item.address || '',
          source: item.source || 'import',
          notes: item.notes || '',
        })
        created++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({ created, skipped, errors })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[LEADS IMPORT]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const [total, byStatus, bySector] = await Promise.all([
      Lead.countDocuments(),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $group: { _id: '$sector', count: { $sum: 1 } } }]),
    ])

    return NextResponse.json({
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      bySector: bySector.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Accès non autorisé') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[LEADS STATS]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
