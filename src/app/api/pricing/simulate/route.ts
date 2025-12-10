import { NextRequest, NextResponse } from 'next/server'
import { simulatePricing1688 } from '@/lib/pricing1688.refactored'
import type { Pricing1688Input } from '@/lib/types/product.types'
import { connectMongoose } from '@/lib/mongoose'
import Product, { IProduct } from '@/lib/models/Product.validated'

/**
 * POST /api/pricing/simulate
 * 
 * Simule le pricing d'un produit 1688 avec calcul complet des coûts et marges
 * 
 * Body:
 * {
 *   productId?: string, // ID produit existant (optionnel)
 *   price1688?: number, // Prix en Yuan (si pas de productId)
 *   baseCost?: number, // Prix en FCFA (alternative)
 *   exchangeRate?: number, // Taux de change (défaut: 100)
 *   shippingMethod: 'air_express' | 'air_15' | 'sea_freight',
 *   weightKg?: number,
 *   volumeM3?: number,
 *   serviceFeeRate?: 5 | 10 | 15, // Défaut: 10
 *   insuranceRate?: number, // Pourcentage
 *   orderQuantity?: number, // Pour calcul marge cumulée
 *   monthlyVolume?: number // Pour estimation bénéfice mensuel
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      price1688,
      baseCost,
      exchangeRate,
      shippingMethod,
      weightKg,
      volumeM3,
      serviceFeeRate,
      insuranceRate,
      orderQuantity = 1,
      monthlyVolume
    } = body

    // Validation
    if (!shippingMethod || !['air_express', 'air_15', 'sea_freight'].includes(shippingMethod)) {
      return NextResponse.json(
        { success: false, error: 'Méthode de transport invalide' },
        { status: 400 }
      )
    }

    // Si productId fourni, charger le produit
    let productData: Partial<Pricing1688Input> = {}
    if (productId) {
      await connectMongoose()
      const productDoc = await Product.findById(productId).lean()
      if (!productDoc || Array.isArray(productDoc)) {
        return NextResponse.json(
          { success: false, error: 'Produit non trouvé' },
          { status: 404 }
        )
      }
      const product = productDoc as unknown as IProduct

      productData = {
        price1688: product.price1688,
        baseCost: product.baseCost,
        exchangeRate: product.exchangeRate,
        serviceFeeRate: product.serviceFeeRate,
        insuranceRate: product.insuranceRate,
        weightKg: product.weightKg || weightKg,
        volumeM3: product.volumeM3 || volumeM3
      }
    }

    // Préparer les données de simulation
    const simulationInput: Pricing1688Input = {
      price1688: price1688 ?? productData.price1688,
      baseCost: baseCost ?? productData.baseCost,
      exchangeRate: exchangeRate ?? productData.exchangeRate,
      shippingMethod,
      weightKg: weightKg ?? productData.weightKg,
      volumeM3: volumeM3 ?? productData.volumeM3,
      serviceFeeRate: serviceFeeRate ?? productData.serviceFeeRate ?? 10,
      insuranceRate: insuranceRate ?? productData.insuranceRate ?? 0,
      orderQuantity,
      monthlyVolume
    }

    // Validation des données requises
    if (!simulationInput.price1688 && !simulationInput.baseCost) {
      return NextResponse.json(
        { success: false, error: 'Prix produit requis (price1688 ou baseCost)' },
        { status: 400 }
      )
    }

    // Calculer le pricing
    const result = simulatePricing1688(simulationInput)

    return NextResponse.json({
      success: true,
      simulation: result
    })
  } catch (error: any) {
    console.error('Erreur simulation pricing:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la simulation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pricing/simulate
 * 
 * Documentation de l'API
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    documentation: {
      endpoint: '/api/pricing/simulate',
      method: 'POST',
      description: 'Simule le pricing complet d\'un produit 1688 avec calcul des coûts, marges et projections',
      body: {
        productId: 'string (optionnel) - ID produit existant',
        price1688: 'number (optionnel) - Prix en Yuan (¥)',
        baseCost: 'number (optionnel) - Prix en FCFA (alternative)',
        exchangeRate: 'number (optionnel, défaut: 100) - Taux de change 1¥ = X FCFA',
        shippingMethod: 'string (requis) - air_express | air_15 | sea_freight',
        weightKg: 'number (optionnel) - Poids en kg',
        volumeM3: 'number (optionnel) - Volume en m³',
        serviceFeeRate: 'number (optionnel, défaut: 10) - 5, 10, ou 15',
        insuranceRate: 'number (optionnel, défaut: 2.5%) - Pourcentage d\'assurance (obligatoire automatique si non spécifié)',
        orderQuantity: 'number (optionnel, défaut: 1) - Quantité commande',
        monthlyVolume: 'number (optionnel) - Volume mensuel moyen'
      },
      response: {
        success: 'boolean',
        simulation: {
          breakdown: {
            productCostFCFA: 'Coût produit en FCFA',
            shippingCostReal: 'Coût transport réel',
            serviceFee: 'Frais de service',
            insuranceFee: 'Frais d\'assurance',
            totalRealCost: 'Coût total réel',
            shippingCostClient: 'Prix transport déclaré client',
            totalClientPrice: 'Prix total facturé client',
            shippingMargin: 'Marge sur transport',
            netMargin: 'Marge nette totale',
            marginPercentage: 'Pourcentage de marge',
            cumulativeMargin: 'Marge cumulée (si orderQuantity > 1)',
            estimatedMonthlyProfit: 'Estimation bénéfice mensuel (si monthlyVolume > 0)'
          },
          currency: 'FCFA',
          shippingMethod: {
            id: 'Méthode transport',
            label: 'Libellé méthode',
            durationDays: 'Durée en jours'
          }
        }
      }
    }
  })
}

