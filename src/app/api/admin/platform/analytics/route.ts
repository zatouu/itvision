import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import User from '@/lib/models/User'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Wallet from '@/lib/models/Wallet'
import WalletTransaction from '@/lib/models/WalletTransaction'
import Payment from '@/lib/models/Payment'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalProviders,
      totalClients,
      totalMissions,
      missionsByStatus,
      missionsToday,
      missionsThisWeek,
      missionsThisMonth,
      totalPointsInCirculation,
      totalLifetimeEarned,
      totalLifetimeSpent,
      totalTopups,
      totalEscrowCharges,
      totalPayments,
      paymentsByStatus,
      walletCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ role: 'TECHNICIAN' }),
      User.countDocuments({ role: 'CLIENT' }),
      ServiceRequest.countDocuments(),
      ServiceRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      ServiceRequest.countDocuments({ createdAt: { $gte: startOfDay } }),
      ServiceRequest.countDocuments({ createdAt: { $gte: startOfWeek } }),
      ServiceRequest.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$points' } } }]),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$lifetimePointsEarned' } } }]),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$lifetimePointsSpent' } } }]),
      WalletTransaction.countDocuments({ kind: 'topup' }),
      WalletTransaction.countDocuments({ kind: 'escrow_charge' }),
      Payment.countDocuments(),
      Payment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Wallet.countDocuments(),
    ])

    const missionsByStatusMap: Record<string, number> = {}
    missionsByStatus.forEach((m: any) => { missionsByStatusMap[m._id || 'unknown'] = m.count })

    const paymentsByStatusMap: Record<string, number> = {}
    paymentsByStatus.forEach((p: any) => { paymentsByStatusMap[p._id || 'unknown'] = p.count })

    // Trends: last 7 days missions
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i))
      return { date: d, label: d.toLocaleDateString('fr-FR', { weekday: 'short' }) }
    })

    const missionsTrend = await Promise.all(
      last7Days.map(async ({ date }) => {
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)
        const count = await ServiceRequest.countDocuments({
          createdAt: { $gte: date, $lt: nextDay }
        })
        return { date: date.toISOString().split('T')[0], count }
      })
    )

    return NextResponse.json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
          providers: totalProviders,
          clients: totalClients,
        },
        missions: {
          total: totalMissions,
          byStatus: missionsByStatusMap,
          today: missionsToday,
          thisWeek: missionsThisWeek,
          thisMonth: missionsThisMonth,
          trend: missionsTrend,
        },
        wallet: {
          totalPointsInCirculation: totalPointsInCirculation[0]?.total || 0,
          totalLifetimeEarned: totalLifetimeEarned[0]?.total || 0,
          totalLifetimeSpent: totalLifetimeSpent[0]?.total || 0,
          walletCount,
          totalTopups,
          totalEscrowCharges,
        },
        payments: {
          total: totalPayments,
          byStatus: paymentsByStatusMap,
        },
      }
    })
  } catch (e) {
    console.error('[GET /api/admin/platform/analytics]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
