import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/api-auth'
import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import TopupPayment from '@/lib/models/TopupPayment'
import { reviewManualPayment } from '@/lib/payments/manual-review'

/**
 * Validation manuelle des paiements QR statiques (Wave QR marchand).
 * GET  → liste des paiements/topups en attente de confirmation
 * POST → { kind: 'payment'|'topup', id, action: 'confirm'|'reject', note? }
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  await connectMongoose()
  const [payments, topups] = await Promise.all([
    Payment.find({ manualConfirm: true, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    TopupPayment.find({ manualConfirm: true, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ])
  return NextResponse.json({ success: true, payments, topups })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  try {
    await connectMongoose()
    const { kind, id, action, note } = await request.json()
    if (!['payment', 'topup'].includes(kind) || !id || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const result = await reviewManualPayment({ kind, id, action, note, actor: 'admin' })
    if (!result.ok) {
      const status = result.status ? 409 : 404
      return NextResponse.json({ error: result.error }, { status })
    }
    return NextResponse.json({ success: true, status: result.status })
  } catch (e: any) {
    console.error('[POST /api/admin/payments/manual]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
