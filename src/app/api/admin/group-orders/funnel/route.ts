import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { GroupShareEvent } from '@/lib/models/GroupShareEvent'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { requireAdminApi } from '@/lib/api-auth'

export const runtime = 'nodejs'

/**
 * GET /api/admin/group-orders/funnel?days=30
 * Entonnoir viral par achat groupé : vues → re-partages → participants, ventilé par canal
 * (« tiktok », « wa », « status », « direct »…). Les participants sont lus dans les
 * documents GroupOrder (participant.via), les vues/re-partages dans GroupShareEvent.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const days = Math.min(180, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 30))
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  await connectMongoose()

  // 1. Événements anonymes (vues, re-partages) agrégés par groupe+canal+événement
  const events = await GroupShareEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { groupId: '$groupId', event: '$event', via: '$via' }, count: { $sum: 1 } } },
  ])

  // 2. Participants avec canal capté au join (sur la même fenêtre)
  const groups = await GroupOrder.find({ createdAt: { $gte: new Date(0) } })
    .select('groupId product.name currentQty targetQty status participants.via participants.qty deadline createdAt')
    .lean() as any[]

  const funnel = new Map<string, any>()
  for (const g of groups) {
    funnel.set(g.groupId, {
      groupId: g.groupId,
      name: g.product?.name || g.groupId,
      status: g.status,
      currentQty: g.currentQty || 0,
      targetQty: g.targetQty || 0,
      channels: {} as Record<string, { views: number; reshares: number; joins: number; joinQty: number }>,
    })
  }

  const ensure = (fid: string, via: string) => {
    const f = funnel.get(fid)
    if (!f) return null
    if (!f.channels[via]) f.channels[via] = { views: 0, reshares: 0, joins: 0, joinQty: 0 }
    return f.channels[via]
  }

  for (const e of events) {
    const c = ensure(e._id.groupId, e._id.via || 'direct')
    if (!c) continue
    if (e._id.event === 'view') c.views += e.count
    else if (e._id.event === 'reshare') c.reshares += e.count
  }

  for (const g of groups) {
    for (const p of g.participants || []) {
      const via = (p.via as string) || 'direct'
      const c = ensure(g.groupId, via)
      if (!c) continue
      c.joins += 1
      c.joinQty += p.qty || 0
    }
  }

  // Totaux par groupe + tri par activité décroissante
  const rows = [...funnel.values()].map((f) => {
    const total = Object.values(f.channels).reduce(
      (acc: any, c: any) => ({
        views: acc.views + c.views,
        reshares: acc.reshares + c.reshares,
        joins: acc.joins + c.joins,
        joinQty: acc.joinQty + c.joinQty,
      }),
      { views: 0, reshares: 0, joins: 0, joinQty: 0 }
    )
    return { ...f, total }
  }).sort((a, b) => (b.total.views + b.total.joins * 5) - (a.total.views + a.total.joins * 5))

  // Synthèse par canal tous groupes confondus
  const byChannel: Record<string, { views: number; reshares: number; joins: number; joinQty: number }> = {}
  for (const f of rows) {
    for (const [via, c] of Object.entries(f.channels) as [string, any][]) {
      if (!byChannel[via]) byChannel[via] = { views: 0, reshares: 0, joins: 0, joinQty: 0 }
      byChannel[via].views += c.views
      byChannel[via].reshares += c.reshares
      byChannel[via].joins += c.joins
      byChannel[via].joinQty += c.joinQty
    }
  }

  return NextResponse.json({ success: true, days, groups: rows, byChannel })
}
