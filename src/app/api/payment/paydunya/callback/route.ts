import { NextRequest, NextResponse } from 'next/server'
import { readPaymentSettings } from '@/lib/payments/settings'
import { getPaymentGateway } from '@/lib/payment-gateway'
import { confirmPayment } from '@/lib/payment-fulfillment'

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
    const gateway = getPaymentGateway(settings, 'paydunya')

    // Vérification explicite : On demande à PayDunya le vrai statut
    // C'est plus sûr que de croire le body entrant sans vérifier la signature sha512
    const verification = await gateway.verifyTransaction(token)

    if (verification.status !== 'completed') {
        console.log(`Transaction ${token} non complétée. Statut: ${verification.status}`)
        return NextResponse.json({ message: 'Non complété' })
    }

    const reference = verification.reference

    const confirmation = await confirmPayment({
      reference,
      amount: verification.amount,
      provider: verification.provider,
      transactionId: token
    })

    if (!confirmation.found) {
        console.error('Callback: Commande introuvable pour ref', reference)
        return NextResponse.json({ message: 'Commande introuvable' }, { status: 404 })
    }

    console.log(`Paiement ${confirmation.type} ${confirmation.changed ? 'validé' : 'déjà validé'} pour ${reference}`)

    // Répondre à PayDunya que tout est OK
    return NextResponse.json({ response_code: '00', response_text: 'Success' })

  } catch (error: any) {
    console.error('PayDunya Callback Error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
