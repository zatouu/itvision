import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AccountingEntry from '@/lib/models/AccountingEntry'
import { jwtVerify } from 'jose'

async function verifyToken(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  return {
    userId: payload.userId as string,
    role: String(payload.role || '').toUpperCase()
  }
}

/**
 * GET /api/accounting/stats
 * Récupère les statistiques comptables (ventes, marges, courbes)
 */
export async function GET(request: NextRequest) {
  try {
    const { role } = await verifyToken(request)
    if (!['ADMIN', 'ACCOUNTANT'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || 'month' // 'day', 'week', 'month', 'year'

    const dateFilter: any = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)

    // Filtre de base
    const baseFilter: any = {
      status: 'confirmed',
      ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter })
    }

    // Statistiques globales
    const [
      totalSales,
      totalRevenue,
      totalCosts,
      totalMargins,
      salesByCategory,
      salesByPeriod,
      topProducts,
      recentEntries
    ] = await Promise.all([
      // Nombre total de ventes
      AccountingEntry.countDocuments({
        ...baseFilter,
        entryType: 'sale'
      }),
      
      // Revenus totaux
      AccountingEntry.aggregate([
        {
          $match: {
            ...baseFilter,
            entryType: { $in: ['sale', 'revenue'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // Coûts totaux
      AccountingEntry.aggregate([
        {
          $match: {
            ...baseFilter,
            entryType: { $in: ['purchase', 'expense'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // Marges totales
      AccountingEntry.aggregate([
        {
          $match: {
            ...baseFilter,
            entryType: 'margin',
            'pricing1688.netMargin': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing1688.netMargin' }
          }
        }
      ]),
      
      // Ventes par catégorie
      AccountingEntry.aggregate([
        {
          $match: {
            ...baseFilter,
            entryType: 'sale'
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { total: -1 } }
      ]),
      
      // Ventes par période (courbe)
      AccountingEntry.aggregate([
        {
          $match: {
            ...baseFilter,
            entryType: 'sale'
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: period === 'day' ? '%Y-%m-%d' :
                        period === 'week' ? '%Y-W%V' :
                        period === 'month' ? '%Y-%m' : '%Y',
                date: '$transactionDate'
              }
            },
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
            margin: {
              $sum: {
                $ifNull: ['$pricing1688.netMargin', 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Top produits
      AccountingEntry.aggregate([
        {
          $match: {
            ...baseFilter,
            entryType: 'sale',
            productId: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$productId',
            productName: { $first: '$productName' },
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
            margin: {
              $sum: {
                $ifNull: ['$pricing1688.netMargin', 0]
              }
            }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),
      
      // Dernières entrées
      AccountingEntry.find(baseFilter)
        .sort({ transactionDate: -1 })
        .limit(10)
        .select('entryNumber entryType amount category transactionDate productName clientName')
        .lean()
    ])

    const totalRevenueAmount = totalRevenue[0]?.total || 0
    const totalCostsAmount = totalCosts[0]?.total || 0
    const totalMarginsAmount = totalMargins[0]?.total || 0
    const netProfit = totalRevenueAmount - totalCostsAmount

    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalSales,
          totalRevenue: totalRevenueAmount,
          totalCosts: totalCostsAmount,
          totalMargins: totalMarginsAmount,
          netProfit,
          profitMargin: totalRevenueAmount > 0 
            ? (netProfit / totalRevenueAmount) * 100 
            : 0
        },
        salesByCategory: salesByCategory.map((item: any) => ({
          category: item._id,
          count: item.count,
          total: item.total
        })),
        salesByPeriod: salesByPeriod.map((item: any) => ({
          period: item._id,
          count: item.count,
          revenue: item.revenue,
          margin: item.margin
        })),
        topProducts: topProducts.map((item: any) => ({
          productId: item._id?.toString(),
          productName: item.productName,
          count: item.count,
          revenue: item.revenue,
          margin: item.margin
        })),
        recentEntries
      }
    })
  } catch (error) {
    console.error('Erreur récupération stats comptables:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

