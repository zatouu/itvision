import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import { connectDB } from '@/lib/db'

interface RouteContext {
  params: Promise<{ orderId: string }>
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const { orderId } = await context.params
  try {
    await connectDB()

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
          clientEmail: order.clientEmail,
          items: order.items,
          subtotal: order.subtotal,
          shipping: {
            method: order.shipping?.method,
            cost: order.shipping?.totalCost || 0,
            estimatedDays: order.shipping?.method === 'express_3j' ? 3 : 
                           order.shipping?.method === 'air_15j' ? 15 : 
                           order.shipping?.method === 'maritime_60j' ? 60 : undefined
          },
          serviceFees: order.serviceFees,
          insurance: order.insurance,
          installation: order.installation,
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
  context: RouteContext
) {
  const { orderId } = await context.params
  try {
    await connectDB()

    const body = await req.json()
    const updateData: any = {}

    // Support de mise à jour de l'adresse (ancien comportement)
    if (body.address && typeof body.address === 'object') {
      updateData.address = body.address
    }

    // Support de mise à jour du statut
    if (body.status) {
      updateData.status = body.status
    }

    // Support de mise à jour du statut de paiement
    if (body.paymentStatus) {
      updateData.paymentStatus = body.paymentStatus
    }

    // Support de notes
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    // Ajout à la timeline si action fournie
    if (body.timelineAction) {
      updateData.$push = {
        timeline: {
          action: body.timelineAction,
          date: new Date().toISOString(),
          by: body.timelineBy || 'Admin'
        }
      }
    }

    updateData.updatedAt = new Date()

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    // Mettre à jour la commande
    const order = await Order.findOneAndUpdate(
      { orderId },
      updateData,
      { new: true }
    ).lean() as any

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    console.log(`Commande ${orderId} mise à jour:`, updateData)

    return NextResponse.json(
      {
        success: true,
        message: 'Commande mise à jour avec succès',
        order
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur mise à jour commande:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const { orderId } = await context.params
  try {
    await connectDB()

    // Supprimer la commande
    const result = await Order.deleteOne({ orderId })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    console.log(`Commande ${orderId} supprimée`)

    return NextResponse.json(
      {
        success: true,
        message: 'Commande supprimée avec succès'
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur suppression commande:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}