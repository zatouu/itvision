import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'
import { readPaymentSettings } from '@/lib/payments/settings'
import { PayDunyaService } from '@/lib/payment-providers/paydunya'

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json()
    
    if (!reference) {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
    }

    const settings = readPaymentSettings()
    
    if (!settings.providers.gateway.active || settings.providers.gateway.provider !== 'paydunya') {
      return NextResponse.json({ error: 'PayDunya n\'est pas activé' }, { status: 403 })
    }

    await connectDB()

    let amount = 0;
    let description = "";
    let customerName = "";
    let customerPhone = "";
    let customerEmail = "";

    // 1. Essayer de trouver une commande groupée (Legacy / Group Buy)
    const groupOrder = await GroupOrder.findOne({ 
      "participants.paymentReference": reference 
    })

    if (groupOrder) {
      const participant = groupOrder.participants.find(
        (p: any) => p.paymentReference === reference
      )

      if (participant) {
        if (participant.paymentStatus === 'paid') {
          return NextResponse.json({ error: 'Déjà payé' }, { status: 400 })
        }
        amount = participant.totalAmount || (participant.qty * (participant.unitPrice || groupOrder.currentUnitPrice || groupOrder.product.basePrice));
        description = `Paiement Achat Groupé #${groupOrder.groupId} - ${groupOrder.product.name} (${participant.qty}x)`;
        customerName = participant.name;
        customerPhone = participant.phone;
        customerEmail = participant.email || "";
      }
    } else {
      // 2. Essayer de trouver une commande standard
      const standardOrder = await Order.findOne({ orderId: reference });
      
      if (standardOrder) {
        if (standardOrder.paymentStatus === 'completed') {
           return NextResponse.json({ error: 'Déjà payé' }, { status: 400 })
        }
        amount = standardOrder.total;
        description = `Commande #${standardOrder.orderId}`;
        customerName = standardOrder.clientName || "Client";
        customerPhone = standardOrder.clientPhone || "";
        customerEmail = standardOrder.clientEmail || "";
      } else {
         return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
      }
    }

    // 3. Initialiser PayDunya
    const paydunya = new PayDunyaService(settings.providers.gateway)
    
    // URL de base du site
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const baseUrl = `${protocol}://${host}`

    const invoice = {
      amount: Math.ceil(amount),
      reference: reference,
      description: description,
      customerName: customerName,
      customerPhone: customerPhone ? customerPhone.replace(/\+/g, '') : "",
      customerEmail: customerEmail,
      returnUrl: `${baseUrl}/payment/success?ref=${reference}`,
      cancelUrl: `${baseUrl}/payment/cancel?ref=${reference}`,
      callbackUrl: `${baseUrl}/api/payment/paydunya/callback` // IPN
    }

    console.log('Initializing PayDunya invoice:', invoice)

    const result = await paydunya.createInvoice(invoice)

    return NextResponse.json({ url: result.url })

  } catch (error: any) {
    console.error('API PayDunya Init Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
