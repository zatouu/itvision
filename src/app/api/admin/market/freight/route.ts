/**
 * POST /api/admin/market/freight
 *   { kind: 'order', orderId, weightKg, volumeM3?, dryRun? }  — pesée réelle d'un colis (régularisation du transport payé)
 *   { kind: 'group', groupId, weightKg, volumeM3?, dryRun? }  — pesée du lot : transport réparti entre participants
 *   { action: 'pickup_ready', kind, id }                     — prévenir que le colis attend au point de retrait
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { recordOrderRealWeight, recordGroupRealWeight, notifyReadyForPickup, FreightError } from '@/lib/market/freight-billing'

const ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER']

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  const body = await request.json().catch(() => ({}))
  const by = auth.user.email || auth.user.id

  try {
    await connectMongoose()
    if (body?.action === 'pickup_ready') {
      if (!['order', 'group'].includes(body.kind) || typeof body.id !== 'string') {
        return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
      }
      const result = await notifyReadyForPickup(body.kind, body.id)
      return NextResponse.json({ success: true, ...result })
    }

    const weightKg = Number(body?.weightKg)
    const volumeM3 = body?.volumeM3 === undefined || body?.volumeM3 === '' ? undefined : Number(body.volumeM3)
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 100_000) {
      return NextResponse.json({ success: false, error: 'Poids réel invalide (kg)' }, { status: 400 })
    }
    if (volumeM3 !== undefined && (!Number.isFinite(volumeM3) || volumeM3 < 0 || volumeM3 > 500)) {
      return NextResponse.json({ success: false, error: 'Volume invalide (m³)' }, { status: 400 })
    }
    const dryRun = body?.dryRun === true
    if (body?.kind === 'order' && typeof body.orderId === 'string') {
      const summary = await recordOrderRealWeight(body.orderId, { weightKg, volumeM3 }, by, dryRun)
      return NextResponse.json({ success: true, summary })
    }
    if (body?.kind === 'group' && typeof body.groupId === 'string') {
      const summary = await recordGroupRealWeight(body.groupId, { weightKg, volumeM3 }, by, dryRun)
      return NextResponse.json({ success: true, summary })
    }
    return NextResponse.json({ success: false, error: 'Type invalide' }, { status: 400 })
  } catch (err) {
    if (err instanceof FreightError) return NextResponse.json({ success: false, error: err.message }, { status: err.status })
    console.error('POST /api/admin/market/freight error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
