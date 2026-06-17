import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const groups = await GroupOrder.find({
      status: { $in: ['open', 'filled'] },
      'participants.joinedAt': { $gte: oneDayAgo }
    })
      .select('groupId product.name participants.name participants.joinedAt createdAt createdBy')
      .sort({ 'participants.joinedAt': -1 })
      .limit(10)
      .lean()

    const activities: Array<{
      type: 'group_joined' | 'group_created' | 'group_filled'
      userName: string
      groupId: string
      productName: string
      createdAt: string
    }> = []

    for (const g of groups as any[]) {
      const participants = (g.participants || []).filter(
        (p: any) => p.joinedAt && new Date(p.joinedAt) >= oneDayAgo
      )
      for (const p of participants.slice(-2)) {
        activities.push({
          type: 'group_joined',
          userName: p.name || 'Un acheteur',
          groupId: g.groupId,
          productName: g.product?.name || 'Produit',
          createdAt: p.joinedAt
        })
      }
    }

    // Also add created events
    const recentCreated = await GroupOrder.find({
      status: { $in: ['open', 'filled'] },
      createdAt: { $gte: oneDayAgo }
    })
      .select('groupId product.name createdAt createdBy')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    for (const g of recentCreated as any[]) {
      activities.push({
        type: 'group_created',
        userName: g.createdBy?.name || 'Un acheteur',
        groupId: g.groupId,
        productName: g.product?.name || 'Produit',
        createdAt: g.createdAt
      })
    }

    // Sort by recency and dedupe, limit to 10
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const unique = activities.filter((item, idx, arr) =>
      idx === arr.findIndex((t) => t.userName === item.userName && t.groupId === item.groupId && t.type === item.type)
    )

    return NextResponse.json({ success: true, activities: unique.slice(0, 10) })
  } catch (error) {
    console.error('GET /api/group-orders/activities error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
