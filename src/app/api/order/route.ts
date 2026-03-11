import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import User from '@/lib/models/User'
import { type ShippingMethodId, type ShippingRate } from '@/lib/logistics'
import { connectDB } from '@/lib/db'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'
import { calculateCartTotal } from '@/lib/pricing/cart-calculator'
import { resolveProductPrice } from '@/lib/pricing/resolve-product-price'
import crypto from 'crypto'
import { emailService } from '@/lib/email-service'
import { requireAuth } from '@/lib/jwt'

function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(req: NextRequest) {
  let mongoConnected = false
  
  try {
    // Checkout invité: l'auth n'est pas obligatoire pour une commande simple.
    // Si l'utilisateur est connecté, on lie la commande à son compte via clientId.
    const auth = await requireAuth(req).catch(() => null)

    // Parser les données
    const { cart, name, phone, email, address, shippingMethod } = await req.json()
    
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

    // Validation: adresse structurée
    if (!address || typeof address !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Adresse invalide - veuillez remplir tous les champs' },
        { status: 400 }
      )
    }

    // Vérifier les champs obligatoires de l'adresse
    const { region, department, neighborhood, street } = address
    if (!region || !department || !neighborhood || !street) {
      return NextResponse.json(
        { success: false, error: 'Adresse incomplète - région, département, quartier et rue obligatoires' },
        { status: 400 }
      )
    }

    // Générer un numéro de commande unique
    const orderId = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Générer un token secret pour le suivi invité (non devinable)
    const trackingToken = crypto.randomBytes(32).toString('base64url')
    const trackingAccessTokenHash = hashTrackingToken(trackingToken)

    // Mapping des méthodes de livraison
    const methodMap: Record<string, ShippingMethodId> = {
      express_3j: 'air_express',
      air_15j: 'air_15',
      maritime_60j: 'sea_freight'
    }

    // Calculer les totaux avec le nouveau calculateur complet
    const method = shippingMethod || 'air_15j'
    const internalMethod = methodMap[method as string] || 'air_15'
    const shippingRates = getConfiguredShippingRates()
    const rate: ShippingRate | undefined = shippingRates[internalMethod]

    if (!rate) {
      return NextResponse.json(
        { success: false, error: 'Méthode de livraison invalide' },
        { status: 400 }
      )
    }

    // Récupérer le tier marketplace de l'utilisateur authentifié
    const userMarketplaceTier = auth?.marketplaceTier || 'standard'

    // Préparer les items pour le calculateur (avec b2bPrice et tier)
    const calculatorItems = cart.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      b2bPrice: item.b2bPrice,
      price1688: item.price1688,
      qty: item.qty || 1,
      weightKg: item.unitWeightKg || item.weightKg,
      lengthCm: item.lengthCm,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      volumeM3: item.unitVolumeM3 || item.volumeM3,
      marketplaceTier: userMarketplaceTier
    }))

    // Calcul complet
    const calculation = await calculateCartTotal(
      calculatorItems,
      internalMethod,
      {
        rate: rate.rate,
        minimumCharge: rate.minimumCharge,
        label: rate.label
      }
    )

    // Vérification quantité minimale
    if (calculation.totalQuantity < 5) {
      return NextResponse.json(
        { success: false, error: `Quantité minimale: 5 produits (actuellement ${calculation.totalQuantity})` },
        { status: 400 }
      )
    }

    // Extraire les valeurs calculées
    const {
      fees,
      subtotalBeforeDiscounts,
      quantityDiscount,
      subtotal,
      shipping,
      total,
      totalQuantity
    } = calculation

    // Se connecter à MongoDB et sauvegarder la commande
    await connectDB()
    mongoConnected = true

    const orderDoc = new Order({
      orderId,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,

      clientId: auth?.userId ? (auth.userId as any) : undefined,

      trackingAccessTokenHash,
      trackingAccessTokenCreatedAt: new Date(),
      
      items: cart.map((item: any) => {
        const qty = item.qty || 1
        const resolved = resolveProductPrice({
          price: item.price,
          b2bPrice: item.b2bPrice,
          qty,
          marketplaceTier: userMarketplaceTier
        })
        return {
          id: item.id,
          variantId: item.variantId,
          name: item.name,
          qty,
          price: resolved.appliedPrice,
          priceType: resolved.priceType,
          currency: item.currency || 'FCFA',
          requiresQuote: item.requiresQuote,
          shipping: item.shipping
        }
      }),
      
      // Nouvelle décomposition des frais
      fees: {
        supplierCost: fees.supplierCost,
        serviceFeeRate: fees.serviceFeeRate,
        serviceFeeStandardRate: fees.serviceFeeStandardRate,
        serviceFeeAmount: fees.serviceFeeAmount,
        serviceFeeSavings: fees.serviceFeeSavings,
        insuranceRate: fees.insuranceRate,
        insuranceAmount: fees.insuranceAmount,
        totalFees: fees.totalFees,
        quantityDiscount: quantityDiscount && quantityDiscount.amount > 0 ? {
          percent: quantityDiscount.percent,
          amount: quantityDiscount.amount,
          label: quantityDiscount.tier?.label || `Réduction ${quantityDiscount.percent}%`
        } : undefined
      },
      subtotalBeforeDiscounts,
      subtotal,
      shipping: {
        method,
        totalCost: shipping?.cost || 0,
        currency: 'FCFA',
        totalWeight: shipping?.actualWeight || 0,
        totalVolume: cart.reduce((sum: number, item: any) => sum + ((item.unitVolumeM3 || item.volumeM3 || 0) * (item.qty || 1)), 0),
        weightDetails: shipping ? {
          actualWeight: shipping.actualWeight,
          volumetricWeight: shipping.volumetricWeight,
          billedWeight: shipping.billedWeight,
          billingMethod: shipping.billingMethod
        } : undefined
      },
      total,
      
      address: {
        street: address.street,
        city: address.city || address.neighborhood || address.region,
        postalCode: address.postalCode || address.department,
        country: address.country || 'Sénégal',
        notes: address.additionalInfo || address.notes
      },
      
      status: 'pending',
      paymentStatus: 'pending',
      currency: 'FCFA',
      source: 'web'
    })

    await orderDoc.save()

    // Incrémenter les stats marketplace de l'utilisateur authentifié
    if (auth?.userId) {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          auth.userId,
          {
            $inc: {
              totalMarketplacePurchases: total,
              marketplaceOrderCount: 1
            }
          },
          { new: true }
        ).lean() as any

        // Vérifier éligibilité Pro si encore standard
        if (updatedUser && updatedUser.marketplaceTier === 'standard') {
          const isEligible =
            (updatedUser.totalMarketplacePurchases || 0) >= 150_000 ||
            (updatedUser.marketplaceOrderCount || 0) >= 3
          if (isEligible && !updatedUser.proRequestedAt) {
            // Créer une notification in-app (best effort)
            try {
              const InAppNotification = (await import('@/lib/models/InAppNotification')).default
              await InAppNotification.create({
                userId: auth.userId,
                type: 'info',
                title: 'Compte Pro disponible',
                message: 'Vous êtes éligible au compte Pro ! Accédez aux prix wholesale dès 1 pièce.',
                actionUrl: '/compte/profil',
                metadata: { proEligible: true }
              })
            } catch {}
          }
        }
      } catch (err) {
        console.error('Erreur mise à jour stats marketplace user:', err)
      }
    }

    // Envoyer le lien de suivi par email si fourni (best effort)
    if (email && typeof email === 'string' && email.includes('@')) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
      const trackingUrl = `${baseUrl}/commandes/${encodeURIComponent(orderId)}?token=${encodeURIComponent(trackingToken)}`
      const subject = `Votre commande ${orderId} - lien de suivi`
      
      // Décomposition des prix pour l'email
      const hasVolumetric = shipping?.billingMethod === 'volumetric'
      const volumetricNote = hasVolumetric 
        ? `<p style="color:#d97706;font-size:12px;margin:4px 0">* Transport calculé sur poids volumétrique (${shipping?.billedWeight?.toFixed(2)}kg vs ${shipping?.actualWeight?.toFixed(2)}kg réels)</p>` 
        : ''
      
      const b2bSavingsNote = fees.serviceFeeSavings > 0
        ? `<p style="color:#059669;font-size:12px;margin:4px 0">* Économie B2B: ${fees.serviceFeeSavings.toLocaleString('fr-FR')} FCFA (frais réduits ${fees.serviceFeeStandardRate}% → ${fees.serviceFeeRate}%)</p>`
        : ''
      
      const quantityDiscountNote = quantityDiscount?.amount && quantityDiscount.amount > 0
        ? `<p style="color:#059669;font-size:12px;margin:4px 0">* Réduction volume ${quantityDiscount.percent}%: -${quantityDiscount.amount.toLocaleString('fr-FR')} FCFA</p>`
        : ''
      
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#10b981,#3b82f6);padding:24px;border-radius:12px 12px 0 0;text-align:center">
            <h2 style="color:white;margin:0;font-size:24px">Commande Confirmée</h2>
            <p style="color:white/80;margin:8px 0 0">Merci pour votre confiance ${String(name || '').trim() || ''} !</p>
          </div>
          
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none">
            <p style="color:#64748b;font-size:14px;margin:0 0 16px">Voici le détail de votre commande et votre lien de suivi (gardez-le précieusement) :</p>
            
            <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:20px">
              <h3 style="color:#1e293b;margin:0 0 16px;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Décomposition du Prix</h3>
              
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr>
                  <td style="padding:8px 0;color:#64748b">Coût fournisseur</td>
                  <td style="padding:8px 0;text-align:right;font-weight:500">${fees.supplierCost.toLocaleString('fr-FR')} FCFA</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b">Frais de service (${fees.serviceFeeRate}%)</td>
                  <td style="padding:8px 0;text-align:right;font-weight:500">${fees.serviceFeeAmount.toLocaleString('fr-FR')} FCFA</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b">Assurance (${fees.insuranceRate}%)</td>
                  <td style="padding:8px 0;text-align:right;font-weight:500">${fees.insuranceAmount.toLocaleString('fr-FR')} FCFA</td>
                </tr>
                ${quantityDiscount?.amount && quantityDiscount.amount > 0 ? `
                <tr style="color:#059669">
                  <td style="padding:8px 0">Réduction volume (${quantityDiscount.percent}%)</td>
                  <td style="padding:8px 0;text-align:right;font-weight:500">-${quantityDiscount.amount.toLocaleString('fr-FR')} FCFA</td>
                </tr>
                ` : ''}
                <tr style="border-top:2px solid #e2e8f0">
                  <td style="padding:12px 0 8px;color:#64748b;font-weight:600">Sous-total</td>
                  <td style="padding:12px 0 8px;text-align:right;font-weight:600">${subtotal.toLocaleString('fr-FR')} FCFA</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b">Transport${hasVolumetric ? ' *' : ''}</td>
                  <td style="padding:8px 0;text-align:right;font-weight:500">${(shipping?.cost || 0).toLocaleString('fr-FR')} FCFA</td>
                </tr>
                <tr style="background:#f0fdf4;border-top:2px solid #22c55e">
                  <td style="padding:16px 8px;color:#166534;font-weight:700;font-size:18px">TOTAL</td>
                  <td style="padding:16px 8px;text-align:right;color:#166534;font-weight:700;font-size:18px">${total.toLocaleString('fr-FR')} FCFA</td>
                </tr>
              </table>
              
              ${b2bSavingsNote}
              ${volumetricNote}
              ${quantityDiscountNote}
            </div>
            
            <div style="background:#eff6ff;padding:16px;border-radius:8px;border:1px solid #bfdbfe;text-align:center">
              <p style="color:#1e40af;font-weight:600;margin:0 0 12px">Votre lien de suivi</p>
              <a href="${trackingUrl}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:12px">Suivre ma commande</a>
              <p style="color:#64748b;font-size:12px;margin:0;word-break:break-all">${trackingUrl}</p>
            </div>
            
            <div style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0">
              <p style="color:#94a3b8;font-size:12px;margin:0">Commande: <span style="font-family:monospace;color:#64748b">${orderId}</span></p>
              <p style="color:#94a3b8;font-size:12px;margin:8px 0 0">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            </div>
          </div>
        </div>
      `.trim()

      emailService
        .sendEmail({
          to: email,
          subject,
          html
        })
        .catch(err => {
          console.error('Erreur envoi email lien de suivi:', err)
        })
    }

    // Enregistrer chaque produit dans la comptabilité (asynchrone, n'attend pas)
    const transportCost = shipping?.cost || 0
    const accountingEntries: any[] = []
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
      supplierCost: fees.supplierCost,
      serviceFeeRate: fees.serviceFeeRate,
      quantityDiscount: quantityDiscount?.amount || 0,
      transport: shipping?.cost || 0,
      total,
      itemCount: cart.length,
      clientName: name,
      billingMethod: shipping?.billingMethod || 'actual'
    })

    return NextResponse.json(
      {
        success: true,
        orderId,
        message: 'Commande enregistrée avec succès',
        total,
        transport: shipping?.cost || 0,
        subtotal,
        subtotalBeforeDiscounts,
        fees: {
          supplierCost: fees.supplierCost,
          serviceFeeRate: fees.serviceFeeRate,
          serviceFeeSavings: fees.serviceFeeSavings,
          insuranceAmount: fees.insuranceAmount,
          totalFees: fees.totalFees
        },
        quantityDiscount: quantityDiscount && quantityDiscount.amount > 0 ? {
          percent: quantityDiscount.percent,
          amount: quantityDiscount.amount
        } : null,
        confirmationUrl: `/commandes/${orderId}?token=${encodeURIComponent(trackingToken)}`
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



