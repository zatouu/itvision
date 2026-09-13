import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AccountingEntry from '@/lib/models/AccountingEntry'
import { simulatePricing1688 } from '@/lib/pricing1688.refactored'
import { isInternalCall } from '@/lib/internal-auth'

/**
 * POST /api/internal/accounting/record-sale
 * Enregistre une vente dans la comptabilité (appel serveur-à-serveur par /api/order).
 * Les données produit 1688 sont fournies par l'appelant (snapshot DB market) —
 * cette route n'importe aucun modèle market (frontière de domaine).
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    await connectMongoose()
    const body = await request.json()
    const {
      productId,
      productName,
      orderId,
      clientId,
      clientName,
      quantity = 1,
      unitPrice,
      shippingMethod,
      shippingCost,
      transactionDate,
      // Snapshot produit fourni par l'appelant (pricing source 1688)
      pricingSource
    } = body

    if (!productId || !productName || !unitPrice) {
      return NextResponse.json(
        { error: 'Informations produit requises' },
        { status: 400 }
      )
    }

    // Calculer le pricing 1688 si applicable
    let pricing1688Data: any = null
    const src = pricingSource && typeof pricingSource === 'object' ? pricingSource : null
    if (src?.price1688 && shippingMethod) {
      const simulation = simulatePricing1688({
        price1688: src.price1688,
        exchangeRate: src.exchangeRate || 100,
        shippingMethod,
        weightKg: src.weightKg,
        volumeM3: src.volumeM3,
        serviceFeeRate: src.serviceFeeRate as any,
        insuranceRate: src.insuranceRate,
        orderQuantity: quantity
      })

      pricing1688Data = {
        price1688: src.price1688,
        exchangeRate: src.exchangeRate || 100,
        productCostFCFA: simulation.productCostFCFA * quantity,
        shippingCostReal: simulation.shippingCostReal * quantity,
        shippingCostClient: shippingCost || simulation.shippingCostClient * quantity,
        serviceFee: simulation.serviceFee * quantity,
        insuranceFee: simulation.insuranceFee * quantity,
        totalRealCost: simulation.totalRealCost * quantity,
        totalClientPrice: (unitPrice * quantity) + (shippingCost || 0),
        shippingMargin: (shippingCost || simulation.shippingCostClient * quantity) - (simulation.shippingCostReal * quantity),
        netMargin: ((unitPrice * quantity) + (shippingCost || 0)) - (simulation.totalRealCost * quantity),
        marginPercentage: simulation.marginPercentage,
        shippingMethod
      }
    }

    const totalAmount = (unitPrice * quantity) + (shippingCost || 0)
    const subCategory = src?.category || undefined

    // Créer l'entrée de vente
    const saleEntry = await AccountingEntry.create({
      entryType: 'sale',
      productId,
      productName,
      orderId,
      clientId,
      clientName,
      amount: totalAmount,
      currency: 'FCFA',
      pricing1688: pricing1688Data,
      category: 'product_sale',
      subCategory,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      status: 'confirmed',
      metadata: {
        quantity,
        unitPrice,
        shippingCost,
        shippingMethod
      }
    })

    // Créer l'entrée de marge si pricing 1688 disponible
    if (pricing1688Data && pricing1688Data.netMargin > 0) {
      await AccountingEntry.create({
        entryType: 'margin',
        productId,
        productName,
        orderId,
        clientId,
        clientName,
        amount: pricing1688Data.netMargin,
        currency: 'FCFA',
        pricing1688: pricing1688Data,
        category: 'product_margin',
        subCategory,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        status: 'confirmed',
        metadata: {
          quantity,
          marginPercentage: pricing1688Data.marginPercentage
        }
      })
    }

    return NextResponse.json({
      success: true,
      entryId: saleEntry._id.toString(),
      entryNumber: saleEntry.entryNumber
    })
  } catch (error) {
    console.error('Erreur enregistrement vente comptable:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
