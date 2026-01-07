import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import { connectDB } from '@/lib/db'

export async function POST(req: NextRequest) {
  let mongoConnected = false
  
  try {
    // Parser les données
    const { cart, name, phone, address, shippingMethod } = await req.json()
    
    // Validation: panier
    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Panier invalide ou vide' },
        { status: 400 }
      )
    }

    // Validation: données client
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Nom et téléphone requis' },
        { status: 400 }
      )
    }

    // Validation: adresse
    if (!address || typeof address !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Adresse invalide' },
        { status: 400 }
      )
    }

    // Générer un numéro de commande unique
    const orderId = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Calculer les totaux
    let subtotal = 0 // Produits avec frais inclus
    let totalWeight = 0
    let totalVolume = 0

    for (const item of cart) {
      if (!item.id || typeof item.price !== 'number') continue
      subtotal += item.price * (item.qty || 1)
      
      // Accumuler poids/volume
      if (item.unitWeightKg) totalWeight += item.unitWeightKg * (item.qty || 1)
      if (item.unitVolumeM3) totalVolume += item.unitVolumeM3 * (item.qty || 1)
    }

    // Calculer le transport global basé sur la méthode de livraison
    // Le client envoie des identifiants courts (ex: 'express_3j', 'air_15j', 'maritime_60j')
    const method = shippingMethod || 'air_15j'

    const methodMap: Record<string, keyof typeof BASE_SHIPPING_RATES> = {
      express_3j: 'air_express',
      air_15j: 'air_15',
      maritime_60j: 'sea_freight'
    }

    const internalMethod = methodMap[method as string] || 'air_15'
    const rate = BASE_SHIPPING_RATES[internalMethod]

    if (!rate) {
      return NextResponse.json(
        { success: false, error: 'Méthode de livraison invalide' },
        { status: 400 }
      )
    }

    let transportCost = 0
    if (rate.billing === 'per_kg') {
      transportCost = Math.round((totalWeight || 0) * rate.rate)
    } else {
      transportCost = Math.round((totalVolume || 0) * rate.rate)
    }
    if (typeof rate.minimumCharge === 'number') transportCost = Math.max(transportCost, rate.minimumCharge)

    const total = subtotal + transportCost

    // Se connecter à MongoDB et sauvegarder la commande
    await connectDB()
    mongoConnected = true

    const orderDoc = new Order({
      orderId,
      clientName: name,
      clientPhone: phone,
      
      items: cart.map((item: any) => ({
        id: item.id,
        variantId: item.variantId,
        name: item.name,
        qty: item.qty || 1,
        price: item.price,
        currency: item.currency || 'FCFA',
        requiresQuote: item.requiresQuote,
        shipping: item.shipping
      })),
      
      subtotal,
      shipping: {
        method,
        totalCost: transportCost,
        currency: 'FCFA',
        totalWeight,
        totalVolume
      },
      total,
      
      address: {
        street: address.street,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        notes: address.notes
      },
      
      status: 'pending',
      paymentStatus: 'pending',
      currency: 'FCFA',
      source: 'web'
    })

    await orderDoc.save()

    // Enregistrer chaque produit dans la comptabilité (asynchrone, n'attend pas)
    const accountingEntries = []
    Promise.all(
      cart.map(async (item: any) => {
        if (!item.id || !item.price) return
        try {
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
                quantity: item.qty || 1,
                unitPrice: item.price, // Prix avec frais inclus
                shippingMethod: method,
                shippingCost: transportCost,
                transactionDate: new Date().toISOString()
              })
            }
          )

          if (accountingResponse.ok) {
            const data = await accountingResponse.json()
            accountingEntries.push(data)
          }
        } catch (err) {
          console.error('Erreur enregistrement comptable pour produit:', item.id, err)
        }
      })
    ).catch(err => console.error('Erreur batch comptabilité:', err))

    // Notifier l'admin via socket.io si disponible
    if (global.io) {
      global.io.to('admin-orders').emit('new-order', {
        orderId,
        clientName: name,
        clientPhone: phone,
        total,
        itemCount: cart.length,
        createdAt: new Date().toISOString()
      })
    }

    console.log('Nouvelle commande créée:', {
      orderId,
      subtotal,
      transport: transportCost,
      total,
      itemCount: cart.length,
      clientName: name
    })

    return NextResponse.json(
      {
        success: true,
        orderId,
        message: 'Commande enregistrée avec succès',
        total,
        transport: transportCost,
        subtotal,
        confirmationUrl: `/commandes/${orderId}`
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('Erreur traitement commande:', e)
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : 'Erreur lors du traitement de la commande'
      },
      { status: 500 }
    )
  }
}



