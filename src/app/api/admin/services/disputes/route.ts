import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Payment from '@/lib/models/Payment'
import User from '@/lib/models/User'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const query: any = {
      $or: [
        { status: 'dispute' },
        { disputeStatus: { $in: ['open', 'under_review', 'resolved'] } },
      ],
    }
    if (status) {
      query.$or = [{ 'disputeStatus': status }, { 'status': status === 'open' ? 'dispute' : undefined }]
      if (status === 'open') {
        query.$or = [{ status: 'dispute' }, { disputeStatus: 'open' }]
      } else {
        query.disputeStatus = status
      }
    }

    const items = await ServiceRequest.find(query)
      .sort({ disputeOpenedAt: -1, createdAt: -1 })
      .limit(200)
      .lean()

    const userIds = new Set<string>()
    const requestIds: string[] = []
    for (const item of items as any[]) {
      if (item.clientId) userIds.add(String(item.clientId))
      if (item.assignedProviderId) userIds.add(String(item.assignedProviderId))
      requestIds.push(String(item._id))
    }

    const [users, payments] = await Promise.all([
      User.find({ _id: { $in: Array.from(userIds) } }).select('name phone').lean(),
      Payment.find({ requestId: { $in: requestIds } }).select('requestId amount depositAmount status').lean(),
    ])

    const userById = new Map(users.map((u: any) => [String(u._id), u]))
    const paymentByRequest = new Map<string, any>()
    for (const payment of payments as any[]) {
      const key = String(payment.requestId)
      if (!paymentByRequest.has(key)) paymentByRequest.set(key, payment)
    }

    const enriched = (items as any[]).map((item) => {
      const client = userById.get(String(item.clientId))
      const provider = item.assignedProviderId ? userById.get(String(item.assignedProviderId)) : null
      const payment = paymentByRequest.get(String(item._id))
      return {
        ...item,
        clientName: client?.name,
        clientPhone: client?.phone,
        providerName: provider?.name,
        providerPhone: provider?.phone,
        paymentAmount: payment?.amount || 0,
        paymentDeposit: payment?.depositAmount || 0,
        paymentStatus: payment?.status,
      }
    })

    return NextResponse.json({ items: enriched })
  } catch (error: any) {
    console.error('[GET /api/admin/services/disputes]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
