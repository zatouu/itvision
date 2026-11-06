import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { sanitizePublicGroup, maskParticipantName } from '@/lib/group-orders/public-group'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const groups = await GroupOrder.find({
      status: { $in: ['open', 'filled'] },
      deadline: { $gte: now }
    })
      .select('groupId status product minQty targetQty currentQty maxQty priceTiers currentUnitPrice deadline shippingMethod shippingCostPerUnit participants.name participants.joinedAt createdAt')
      .sort({ currentQty: -1, deadline: 1 })
      .limit(20)
      .lean()

    // Enrich with computed fields — sortie sanitisee (pas d'identite/montant participant)
    const enriched = groups.map((g: any) => {
      const progress = g.targetQty > 0 ? Math.round((g.currentQty / g.targetQty) * 100) : 0
      const daysLeft = Math.ceil((new Date(g.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isAlmostFull = g.targetQty - g.currentQty <= 3 && g.targetQty > g.currentQty
      const isNew = g.createdAt && new Date(g.createdAt) > oneDayAgo
      const isPopular = g.participants && g.participants.length >= 10
      const soloPrice = g.product?.basePrice || 0
      const groupPrice = g.currentUnitPrice || soloPrice
      const savingsPercent = soloPrice > 0 ? Math.round(((soloPrice - groupPrice) / soloPrice) * 100) : 0

      return {
        ...sanitizePublicGroup(g),
        progress,
        daysLeft,
        isAlmostFull,
        isNew,
        isPopular,
        soloPrice,
        groupPrice,
        savingsPercent,
        recentParticipants: (g.participants || []).slice(-5).map((p: any) => ({
          name: maskParticipantName(p.name),
          joinedAt: p.joinedAt
        }))
      }
    })

    // Pick top 3 diverse featured
    // 1. Almost full / urgent
    // 2. Popular
    // 3. New or high savings
    const urgent = enriched.find((g: any) => g.isAlmostFull && g.status === 'open')
    const popular = enriched.find((g: any) => g.isPopular && g.groupId !== urgent?.groupId)
    const newest = enriched.find((g: any) => g.isNew && g.groupId !== urgent?.groupId && g.groupId !== popular?.groupId)
    const bestSavings = enriched
      .filter((g: any) => g.groupId !== urgent?.groupId && g.groupId !== popular?.groupId && g.groupId !== newest?.groupId)
      .sort((a: any, b: any) => b.savingsPercent - a.savingsPercent)[0]

    const featured = [urgent, popular, newest || bestSavings].filter(Boolean).slice(0, 3)

    // If less than 3, fill with highest progress
    if (featured.length < 3) {
      const usedIds = new Set(featured.map((g: any) => g.groupId))
      const remaining = enriched
        .filter((g: any) => !usedIds.has(g.groupId))
        .sort((a: any, b: any) => b.progress - a.progress)
      while (featured.length < 3 && remaining.length > 0) {
        featured.push(remaining.shift())
      }
    }

    return NextResponse.json({ success: true, featured })
  } catch (error) {
    console.error('GET /api/group-orders/featured error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
