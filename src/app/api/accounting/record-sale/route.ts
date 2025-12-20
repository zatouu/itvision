import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import AccountingEntry from '@/lib/models/AccountingEntry'
import Product, { type IProduct } from '@/lib/models/Product.validated'
import { simulatePricing1688 } from '@/lib/pricing1688.refactored'

/**
 * POST /api/accounting/record-sale
 * Enregistre automatiquement une vente dans la comptabilité
 * Appelé automatiquement lors d'une commande
 */
export async function POST(request: NextRequest) {
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
      transactionDate
    } = body

    if (!productId || !productName || !unitPrice) {
      return NextResponse.json(
        { error: 'Informations produit requises' },
        { status: 400 }
      )
    }

    // Charger le produit pour obtenir les infos 1688
    const productDoc = await Product.findById(productId).lean()
    if (!productDoc || Array.isArray(productDoc)) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }
    // Type assertion pour accéder aux propriétés 1688
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = productDoc as any

    // Calculer le pricing 1688 si applicable
    let pricing1688Data: any = null
    if (product?.price1688 && shippingMethod) {
      const simulation = simulatePricing1688({
        price1688: product.price1688,
        exchangeRate: product.exchangeRate || 100,
        shippingMethod,
        weightKg: product.weightKg,
        volumeM3: product.volumeM3,
        serviceFeeRate: product.serviceFeeRate as any,
        insuranceRate: product.insuranceRate,
        orderQuantity: quantity
      })

      pricing1688Data = {
        price1688: product.price1688,
        exchangeRate: product.exchangeRate || 100,
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
      subCategory: product.category,
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
        subCategory: product.category,
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

