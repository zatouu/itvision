import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { GroupOrder } from '@/lib/models/GroupOrder'
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

    await dbConnect()

    // 1. Retrouver la commande et le participant
    const groupOrder = await GroupOrder.findOne({ 
      "participants.paymentReference": reference 
    })

    if (!groupOrder) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    const participant = groupOrder.participants.find(
      (p: any) => p.paymentReference === reference
    )

    if (!participant) {
      return NextResponse.json({ error: 'Participant introuvable' }, { status: 404 })
    }

    if (participant.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Déjà payé' }, { status: 400 })
    }

    // 2. Calculer le montant sûr
    const amount = participant.totalAmount || (participant.qty * (participant.unitPrice || groupOrder.currentUnitPrice || groupOrder.product.basePrice))
    
    // 3. Initialiser PayDunya
    const paydunya = new PayDunyaService(settings.providers.gateway)
    
    // URL de base du site
    // On utilise une variable d'env ou on déduit de la request
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const baseUrl = `${protocol}://${host}`

    const invoice = {
      amount: Math.ceil(amount), // PayDunya n'aime pas les décimales parfois
      reference: reference,
      description: `Paiement Achat Groupé #${groupOrder.groupId} - ${groupOrder.product.name} (${participant.qty}x)`,
      customerName: participant.name,
      customerPhone: participant.phone.replace(/\+/g, ''), // Nettoyage simple
      customerEmail: participant.email,
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
