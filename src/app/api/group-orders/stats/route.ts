import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const now = new Date()

    const [
      totalOpen,
      totalFilled,
      totalParticipants,
      totalSavedAgg
    ] = await Promise.all([
      GroupOrder.countDocuments({ status: 'open', deadline: { $gte: now } }),
      GroupOrder.countDocuments({ status: 'filled' }),
      GroupOrder.aggregate([
        { $match: { status: { $in: ['open', 'filled', 'ordering', 'ordered'] } } },
        { $group: { _id: null, total: { $sum: { $size: '$participants' } } } }
      ]),
      GroupOrder.aggregate([
        { $match: { status: { $in: ['filled', 'ordering', 'ordered', 'shipped', 'delivered'] } } },
        {
          $project: {
            savings: {
              $multiply: [
                { $subtract: ['$product.basePrice', '$currentUnitPrice'] },
                { $ifNull: ['$currentQty', 0] }
              ]
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$savings' } } }
      ])
    ])

    const totalParticipantsCount = totalParticipants[0]?.total || 0
    const totalSaved = Math.max(0, totalSavedAgg[0]?.total || 0)

    return NextResponse.json({
      success: true,
      stats: {
        openGroupsCount: totalOpen,
        totalFilled: totalFilled,
        totalParticipants: totalParticipantsCount,
        totalSaved
      }
    })
  } catch (error) {
    console.error('GET /api/group-orders/stats error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
