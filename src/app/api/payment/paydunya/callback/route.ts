import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { readPaymentSettings } from '@/lib/payments/settings'
import { PayDunyaService } from '@/lib/payment-providers/paydunya'

export async function POST(request: NextRequest) {
  try {
    // PayDunya peut envoyer en JSON ou FormData
    let d: any = {}
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      d = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const dataObj: any = {}
      formData.forEach((value, key) => (dataObj[key] = value))
      d = dataObj
    }
    
    console.log('PayDunya Callback received:', d)
    
    // Le token de la facture est souvent dans 'data[invoice][token]' ou directement 'token' selon le mode
    // En mode standard PSR: data.invoice.token
    const token = d?.invoice?.token || d?.token

    if (!token) {
        return NextResponse.json({ message: 'Token manquant' }, { status: 400 })
    }

    const settings = readPaymentSettings()
    const paydunya = new PayDunyaService(settings.providers.gateway)

    // Vérification explicite : On demande à PayDunya le vrai statut
    // C'est plus sûr que de croire le body entrant sans vérifier la signature sha512
    const verification = await paydunya.verifyTransaction(token)

    if (verification.status !== 'completed') {
        console.log(`Transaction ${token} non complétée. Statut: ${verification.status}`)
        return NextResponse.json({ message: 'Non complété' })
    }

    // Mise à jour de la base de données
    await dbConnect()
    
    // On cherche le participant via la référence retournée par PayDunya
    const reference = verification.reference
    
    const groupOrder = await GroupOrder.findOne({ 
      "participants.paymentReference": reference 
    })

    if (!groupOrder) {
        console.error('Callback: Commande introuvable pour ref', reference)
        return NextResponse.json({ message: 'Commande introuvable' }, { status: 404 })
    }

    const participant = groupOrder.participants.find(
      (p: any) => p.paymentReference === reference
    )

    if (participant) {
        // Mettre à jour le statut
        if (participant.paymentStatus !== 'paid') {
            participant.paymentStatus = 'paid'
            participant.paidAmount = verification.amount
            participant.transactionId = token // On garde le token PayDunya comme ID de transaction
            participant.paymentUpdatedAt = new Date()
            
            // Mise à jour des totaux de la commande groupée (facultatif mais recommandé pour le suivi global)
            // groupOrder.currentQty += ... (si ce n'était pas déjà compté)
            
            await groupOrder.save()
            console.log(`Paiement validé pour ${participant.name} (${reference})`)
        }
    }

    // Répondre à PayDunya que tout est OK
    return NextResponse.json({ response_code: '00', response_text: 'Success' })

  } catch (error: any) {
    console.error('PayDunya Callback Error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
