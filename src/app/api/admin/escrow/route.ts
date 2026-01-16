/**
 * API Admin pour la gestion des transactions escrow
 * GET /api/admin/escrow - Liste toutes les transactions avec stats
 */
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { EscrowTransaction } from '@/lib/models/EscrowTransaction'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await dbConnect()

    // Récupérer toutes les transactions
    const transactions = await EscrowTransaction.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    // Calculer les stats
    const stats = {
      total: transactions.length,
      pending: transactions.filter(t => t.status === 'pending_payment').length,
      secured: transactions.filter(t => ['funds_secured', 'payment_received'].includes(t.status)).length,
      inTransit: transactions.filter(t => ['order_placed', 'order_confirmed', 'in_transit'].includes(t.status)).length,
      completed: transactions.filter(t => t.status === 'completed').length,
      disputed: transactions.filter(t => t.status === 'disputed').length,
      totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      paidAmount: transactions.reduce((sum, t) => sum + (t.paidAmount || 0), 0)
    }

    return NextResponse.json({
      transactions,
      stats
    })

  } catch (error) {
    console.error('Erreur API admin escrow:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
