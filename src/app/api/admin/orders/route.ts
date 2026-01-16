import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'

/**
 * GET /api/admin/orders
 * Récupère toutes les commandes (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminApi(req)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await connectDB()

    // Récupérer toutes les commandes triées par date décroissante
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(
      {
        success: true,
        count: orders.length,
        orders: orders || []
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur récupération commandes admin:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
}
