import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AppConfig from '@/lib/models/AppConfig'
import { invalidateAppConfigCache } from '@/lib/wallet'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    let cfg = await AppConfig.findOne({ key: 'global' }).lean()
    if (!cfg) {
      cfg = await AppConfig.create({ key: 'global' })
      cfg = cfg.toObject()
    }

    return NextResponse.json({ success: true, config: cfg })
  } catch (e) {
    console.error('[GET /api/admin/platform/config]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const {
      monetization,
      escrow,
    } = body

    const update: Record<string, any> = {}
    if (monetization) update['monetization'] = monetization
    if (escrow) update['escrow'] = escrow

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const cfg = await AppConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { new: true, upsert: true }
    ).lean()

    invalidateAppConfigCache()

    return NextResponse.json({ success: true, config: cfg })
  } catch (e) {
    console.error('[POST /api/admin/platform/config]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
