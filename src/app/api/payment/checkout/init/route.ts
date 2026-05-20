import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'
import { readPaymentSettings } from '@/lib/payments/settings'
import { getActivePaymentGateway } from '@/lib/payment-gateway'

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json()

    if (!reference) {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
    }

    const settings = readPaymentSettings()
    const gateway = getActivePaymentGateway(settings)

    await connectDB()

    let amount = 0
    let description = ''
    let customerName = ''
    let customerPhone = ''
    let customerEmail = ''

    const groupOrder = await GroupOrder.findOne({
      'participants.paymentReference': reference
    })

    if (groupOrder) {
      const participant = groupOrder.participants.find(
        (p: any) => p.paymentReference === reference
      )

      if (participant) {
        if (participant.paymentStatus === 'paid') {
          return NextResponse.json({ error: 'Déjà payé' }, { status: 400 })
        }

        amount = participant.totalAmount || (participant.qty * (participant.unitPrice || groupOrder.currentUnitPrice || groupOrder.product.basePrice))
        description = `Paiement Achat Groupé #${groupOrder.groupId} - ${groupOrder.product.name} (${participant.qty}x)`
        customerName = participant.name
        customerPhone = participant.phone
        customerEmail = participant.email || ''
      }
    } else {
      const standardOrder = await Order.findOne({ orderId: reference })

      if (standardOrder) {
        if (standardOrder.paymentStatus === 'completed') {
          return NextResponse.json({ error: 'Déjà payé' }, { status: 400 })
        }

        amount = standardOrder.total
        description = `Commande #${standardOrder.orderId}`
        customerName = standardOrder.clientName || 'Client'
        customerPhone = standardOrder.clientPhone || ''
        customerEmail = standardOrder.clientEmail || ''
      } else {
        return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
      }
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const configuredBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, '')
    const baseUrl = configuredBaseUrl || `${protocol}://${host}`

    const result = await gateway.createCheckout({
      amount: Math.ceil(amount),
      reference,
      description,
      customerName,
      customerPhone: customerPhone ? customerPhone.replace(/\+/g, '') : '',
      customerEmail,
      returnUrl: `${baseUrl}/payment/success?ref=${reference}`,
      cancelUrl: `${baseUrl}/payment/cancel?ref=${reference}`,
      callbackUrl: `${baseUrl}/api/payment/${gateway.provider}/callback`
    })

    return NextResponse.json({
      provider: result.provider,
      token: result.token,
      url: result.url
    })
  } catch (error: any) {
    console.error('[Payment Checkout Init] Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
