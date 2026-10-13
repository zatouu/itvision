import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { withOptionalTransaction } from '@/lib/mongo-transaction'
import AccountingEntry from '@/lib/models/AccountingEntry'
import { simulatePricing1688 } from '@/lib/pricing1688.refactored'
import { isInternalCall } from '@/lib/internal-auth'
import { readSharedTariffs, configuredShippingRates, sharedPricingSnapshotSchema } from '@/lib/pricing/shared-settings'

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
    let shippingCostsVersion: number | undefined
    let pricingVersion: number | undefined
    const src = pricingSource && typeof pricingSource === 'object' ? pricingSource : null
    if (src?.price1688 && shippingMethod) {
      const tariffs = await readSharedTariffs()
      const costs = tariffs.costs
      const pricing = body.pricingSnapshot === undefined ? tariffs.pricing : sharedPricingSnapshotSchema.parse(body.pricingSnapshot)
      const defaults = pricing.config.defaults
      pricingVersion = pricing.version
      shippingCostsVersion = costs.version
      const simulation = simulatePricing1688({
        price1688: src.price1688,
        exchangeRate: src.exchangeRate || defaults.defaultExchangeRate,
        shippingMethod,
        weightKg: src.weightKg,
        volumeM3: src.volumeM3,
        serviceFeeRate: src.serviceFeeRate ?? defaults.defaultServiceFeeRate,
        insuranceRate: src.insuranceRate ?? defaults.defaultInsuranceRate,
        orderQuantity: quantity
      }, undefined, configuredShippingRates(pricing.config), defaults.singleImportServiceFeeRate, costs.costs)

      pricing1688Data = {
        price1688: src.price1688,
        exchangeRate: src.exchangeRate || defaults.defaultExchangeRate,
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

    // Appel rejoué (relance réseau, double clic) : la vente est déjà en comptabilité
    if (orderId) {
      const existing = await AccountingEntry.findOne({ entryType: 'sale', orderId: String(orderId), productId: String(productId), amount: totalAmount, 'metadata.quantity': quantity })
        .select('_id entryNumber').lean() as any
      if (existing) {
        return NextResponse.json({ success: true, entryId: String(existing._id), entryNumber: existing.entryNumber, duplicate: true })
      }
    }

    // Vente et marge : toutes les deux ou aucune
    const transactionAt = transactionDate ? new Date(transactionDate) : new Date()
    const saleEntry: any = await withOptionalTransaction(async (session) => {
      const [sale] = await AccountingEntry.create([{
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
        transactionDate: transactionAt,
        status: 'confirmed',
        metadata: { quantity, unitPrice, shippingCost, shippingMethod, shippingCostsVersion, pricingVersion },
      }], { session })

      if (pricing1688Data && pricing1688Data.netMargin > 0) {
        await AccountingEntry.create([{
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
          transactionDate: transactionAt,
          status: 'confirmed',
          metadata: { quantity, marginPercentage: pricing1688Data.marginPercentage },
        }], { session })
      }
      return sale
    })

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
