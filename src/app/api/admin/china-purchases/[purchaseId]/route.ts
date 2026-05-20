import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'
import { ChinaPurchase, CHINA_PURCHASE_STATUSES } from '@/lib/models/ChinaPurchase'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { buildChinaPurchaseSummary } from '@/lib/china-purchase'

interface RouteContext {
  params: Promise<{ purchaseId: string }>
}

const ALLOWED_PATCH_FIELDS = [
  'platformOrderId',
  'productUrl',
  'sellerName',
  'sellerContact',
  'alipay',
  'guangzhouReception',
  'qualityCheck',
  'freight',
  'notes'
]

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()
    const { purchaseId } = await context.params
    const purchase = await ChinaPurchase.findOne({ purchaseId }).lean()

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Achat Chine non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ success: true, purchase })
  } catch (error) {
    console.error('Erreur GET /api/admin/china-purchases/[purchaseId]:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()
    const { purchaseId } = await context.params
    const body = await request.json().catch(() => ({}))
    const purchase = await ChinaPurchase.findOne({ purchaseId })

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Achat Chine non trouvé' }, { status: 404 })
    }

    if (body.status !== undefined) {
      if (!CHINA_PURCHASE_STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'status invalide' }, { status: 400 })
      }
      if (purchase.status !== body.status) {
        purchase.status = body.status
        purchase.statusHistory.push({
          status: body.status,
          changedAt: new Date(),
          by: auth.user?.email || auth.user?.name || 'Admin',
          note: typeof body.statusNote === 'string' ? body.statusNote : undefined
        })
      }
    }

    for (const field of ALLOWED_PATCH_FIELDS) {
      if (body[field] !== undefined) {
        ;(purchase as any)[field] = body[field]
      }
    }

    await purchase.save()

    if (purchase.source?.type === 'group_order' && purchase.source?.id) {
      await GroupOrder.updateOne(
        { groupId: purchase.source.id },
        { chinaPurchase: buildChinaPurchaseSummary(purchase) }
      )
    }

    return NextResponse.json({ success: true, purchase })
  } catch (error) {
    console.error('Erreur PATCH /api/admin/china-purchases/[purchaseId]:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
