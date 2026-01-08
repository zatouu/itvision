/**
 * API Route - Programme de fidélité
 * 
 * GET /api/loyalty/[customerId]
 * Récupère le statut fidélité d'un client
 * 
 * GET /api/loyalty/[customerId]/rewards
 * Liste les récompenses disponibles
 * 
 * GET /api/loyalty/[customerId]/history
 * Historique des transactions de points
 * 
 * POST /api/loyalty/[customerId]/redeem
 * Body: { rewardId: string }
 * Utilise des points pour une récompense
 */

import { NextRequest, NextResponse } from 'next/server'
import { loyaltyEngine } from '@/lib/engines/loyalty'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'rewards':
        const rewards = loyaltyEngine.getAvailableRewards(customerId)
        return NextResponse.json({
          success: true,
          data: rewards,
        })

      case 'history':
        const limit = parseInt(searchParams.get('limit') || '20', 10)
        const history = loyaltyEngine.getTransactionHistory(customerId, limit)
        return NextResponse.json({
          success: true,
          data: history,
        })

      default:
        // Statut fidélité par défaut
        const loyalty = loyaltyEngine.getCustomerLoyalty(customerId)
        return NextResponse.json({
          success: true,
          data: loyalty,
        })
    }

  } catch (error) {
    console.error('[API Loyalty] Erreur GET:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données fidélité' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params
    const body = await req.json()
    const { action, rewardId, points, reason, reference } = body

    switch (action) {
      case 'redeem':
        if (!rewardId) {
          return NextResponse.json(
            { error: 'rewardId est requis' },
            { status: 400 }
          )
        }
        const result = loyaltyEngine.redeemPoints(customerId, rewardId)
        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: result.success ? {
            reward: result.reward,
            transaction: result.transaction,
          } : undefined,
        }, {
          status: result.success ? 200 : 400,
        })

      case 'earn':
        if (!points || !reason) {
          return NextResponse.json(
            { error: 'points et reason sont requis' },
            { status: 400 }
          )
        }
        const transaction = loyaltyEngine.earnPoints(
          customerId,
          points,
          reason,
          reference
        )
        return NextResponse.json({
          success: true,
          message: `${transaction.points} points attribués`,
          data: transaction,
        })

      case 'apply-discount':
        const amount = body.amount
        if (!amount) {
          return NextResponse.json(
            { error: 'amount est requis' },
            { status: 400 }
          )
        }
        const discount = loyaltyEngine.applyTierDiscount(customerId, amount)
        return NextResponse.json({
          success: true,
          data: discount,
        })

      default:
        return NextResponse.json(
          { error: `Action non reconnue: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[API Loyalty] Erreur POST:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'opération fidélité' },
      { status: 500 }
    )
  }
}
