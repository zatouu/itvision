import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AppConfig from '@/lib/models/AppConfig'
import { invalidateAppConfigCache } from '@/lib/wallet'
import { WHATSAPP_RELAY_EVENTS } from '@/lib/whatsapp-relay-events'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    let cfg: any = await AppConfig.findOne({ key: 'global' }).lean()
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
      ai,
      integrations,
    } = body

    const update: Record<string, any> = {}
    if (monetization) update['monetization'] = monetization
    if (escrow) update['escrow'] = escrow
    if (ai) update['ai'] = ai
    if (typeof integrations?.ddmBridge?.enabled === 'boolean') update['integrations.ddmBridge.enabled'] = integrations.ddmBridge.enabled
    if (typeof integrations?.onlinePayments?.enabled === 'boolean') update['integrations.onlinePayments.enabled'] = integrations.onlinePayments.enabled
    if (typeof integrations?.whatsappRelay?.enabled === 'boolean') update['integrations.whatsappRelay.enabled'] = integrations.whatsappRelay.enabled
    if (typeof integrations?.sourcingAutoSend?.enabled === 'boolean') update['integrations.sourcingAutoSend.enabled'] = integrations.sourcingAutoSend.enabled
    const minRel = Number(integrations?.sourcingAutoSend?.minRelevance)
    if (Number.isFinite(minRel) && minRel >= 0.5 && minRel <= 1) update['integrations.sourcingAutoSend.minRelevance'] = minRel
    if (integrations?.whatsappRelay?.events && typeof integrations.whatsappRelay.events === 'object') {
      for (const ev of WHATSAPP_RELAY_EVENTS) {
        const v = integrations.whatsappRelay.events[ev.key]
        if (typeof v === 'boolean') update[`integrations.whatsappRelay.events.${ev.key}`] = v
      }
    }

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
