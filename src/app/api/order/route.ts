import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { cart, name, phone, address } = await req.json()
    
    // Validation
    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Panier invalide ou vide' },
        { status: 400 }
      )
    }

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Nom et téléphone requis' },
        { status: 400 }
      )
    }

    // Générer un numéro de commande
    const orderId = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Enregistrer chaque produit dans la comptabilité
    const accountingEntries = []
    for (const item of cart) {
      if (!item.id || !item.price) continue

      try {
        // Appel interne à l'API d'enregistrement comptable
        const baseUrl = req.nextUrl.origin
        const accountingResponse = await fetch(
          `${baseUrl}/api/accounting/record-sale`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: item.id,
              productName: item.name,
              orderId,
              clientName: name,
              clientId: undefined, // Pas d'ID client si commande non authentifiée
              quantity: item.qty || 1,
              unitPrice: item.price,
              shippingMethod: item.shipping?.id || 'air_15',
              shippingCost: item.shipping?.cost || 0,
              transactionDate: new Date().toISOString()
            })
          }
        )

        if (accountingResponse.ok) {
          const accountingData = await accountingResponse.json()
          accountingEntries.push(accountingData)
        }
      } catch (accountingError) {
        // Log l'erreur mais continue le traitement
        console.error('Erreur enregistrement comptable pour produit:', item.id, accountingError)
      }
    }

    console.log('Nouvelle commande enregistrée:', {
      orderId,
      cart,
      name,
      phone,
      address,
      accountingEntries: accountingEntries.length
    })

    return NextResponse.json({
      success: true,
      orderId,
      message: 'Commande enregistrée avec succès',
      accountingEntries: accountingEntries.length
    })
  } catch (e) {
    console.error('Erreur traitement commande:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du traitement de la commande' },
      { status: 500 }
    )
  }
}


