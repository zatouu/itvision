import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import { connectDB } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await connectDB()

    const orderId = params.orderId

    // Chercher la commande
    const order = await Order.findOne({ orderId }).lean() as any

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          orderId: order.orderId,
          clientName: order.clientName,
          clientPhone: order.clientPhone,
          items: order.items,
          subtotal: order.subtotal,
          shipping: order.shipping,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          address: order.address,
          createdAt: order.createdAt,
          currency: order.currency
        }
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur récupération commande:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    )
  }
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await connectDB()

    const orderId = params.orderId
    const { address } = await req.json()

    if (!address || typeof address !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Adresse invalide' },
        { status: 400 }
      )
    }

    // Mettre à jour l'adresse de la commande
    const order = await Order.findOneAndUpdate(
      { orderId },
      { address },
      { new: true }
    ).lean() as any

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    console.log(`Adresse mise à jour pour commande ${orderId}:`, address)

    return NextResponse.json(
      {
        success: true,
        message: 'Adresse mise à jour avec succès',
        order: {
          orderId: order.orderId,
          address: order.address
        }
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur mise à jour adresse:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}