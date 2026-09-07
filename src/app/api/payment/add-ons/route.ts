import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'

const VALID_ADD_ONS = [
  { id: 'assurance', name: 'Assurance transport', price: 1500 },
  { id: 'express', name: 'Livraison express Dakar', price: 2500 },
  { id: 'gift', name: 'Emballage cadeau', price: 1000 },
]

export async function POST(req: NextRequest) {
  try {
    const { reference, addOnIds } = await req.json()

    if (!reference || !Array.isArray(addOnIds)) {
      return NextResponse.json({ error: 'Référence ou add-ons manquants' }, { status: 400 })
    }

    const selectedAddOns = addOnIds
      .map((id: string) => VALID_ADD_ONS.find(a => a.id === id))
      .filter(Boolean) as typeof VALID_ADD_ONS

    if (selectedAddOns.length !== addOnIds.length) {
      return NextResponse.json({ error: 'Add-on invalide' }, { status: 400 })
    }

    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)

    await connectDB()

    const order = await Order.findOne({ orderId: reference })
    if (order) {
      if (order.paymentStatus === 'completed') {
        return NextResponse.json({ error: 'Commande déjà payée' }, { status: 409 })
      }
      order.addOns = selectedAddOns
      order.addOnsTotal = addOnsTotal
      order.total = (order.subtotal || 0) + (order.shipping?.totalCost || 0) + addOnsTotal
      await order.save()
      return NextResponse.json({ success: true, addOns: selectedAddOns, addOnsTotal, total: order.total })
    }

    const groupOrder = await GroupOrder.findOne({ 'participants.paymentReference': reference })
    if (groupOrder) {
      const participant = groupOrder.participants.find((p: any) => p.paymentReference === reference)
      if (!participant) {
        return NextResponse.json({ error: 'Participant introuvable' }, { status: 404 })
      }
      if (participant.paymentStatus === 'paid') {
        return NextResponse.json({ error: 'Déjà payé' }, { status: 409 })
      }
      participant.addOns = selectedAddOns
      participant.addOnsTotal = addOnsTotal
      participant.totalAmount = (participant.totalAmount || 0) + addOnsTotal
      await groupOrder.save()
      return NextResponse.json({ success: true, addOns: selectedAddOns, addOnsTotal, total: participant.totalAmount })
    }

    return NextResponse.json({ error: 'Référence introuvable' }, { status: 404 })
  } catch (error: any) {
    console.error('[Payment Add-ons] Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
