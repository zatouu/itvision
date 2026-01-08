/**
 * API Route - Rapports de rentabilité
 * 
 * GET /api/admin/profitability
 * Paramètres:
 * - period: daily | weekly | monthly | quarterly | yearly (défaut: monthly)
 * - startDate: Date ISO (défaut: 30 jours avant)
 * - endDate: Date ISO (défaut: aujourd'hui)
 * 
 * GET /api/admin/profitability/products
 * Liste les produits avec leur rentabilité
 * 
 * GET /api/admin/profitability/customers
 * Liste les clients les plus rentables
 * 
 * GET /api/admin/profitability/suggestions
 * Suggestions d'ajustement de prix
 */

import { NextRequest, NextResponse } from 'next/server'
import { profitabilityEngine } from '@/lib/engines/profitability'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    // Dates par défaut: 30 derniers jours
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date()
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const period = (searchParams.get('period') || 'monthly') as 
      'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

    switch (action) {
      case 'products': {
        // Rentabilité par produit
        const report = profitabilityEngine.generateReport(startDate, endDate, period)
        return NextResponse.json({
          success: true,
          data: {
            period: report.period,
            products: report.byProduct,
          },
        })
      }

      case 'customers': {
        // Top clients
        const report = profitabilityEngine.generateReport(startDate, endDate, period)
        return NextResponse.json({
          success: true,
          data: {
            period: report.period,
            customers: report.topCustomers,
          },
        })
      }

      case 'suggestions': {
        // Suggestions d'ajustement de prix
        const suggestions = profitabilityEngine.suggestPriceAdjustments()
        return NextResponse.json({
          success: true,
          data: suggestions,
        })
      }

      case 'low-margin': {
        // Produits à faible marge
        const threshold = parseInt(searchParams.get('threshold') || '15', 10)
        const lowMargin = profitabilityEngine.getLowMarginProducts(threshold)
        return NextResponse.json({
          success: true,
          data: lowMargin,
        })
      }

      default: {
        // Rapport complet par défaut
        const report = profitabilityEngine.generateReport(startDate, endDate, period)
        return NextResponse.json({
          success: true,
          data: report,
        })
      }
    }

  } catch (error) {
    console.error('[API Profitability] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport de rentabilité' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, productId, cost } = body

    switch (action) {
      case 'set-cost':
        if (!productId || cost === undefined) {
          return NextResponse.json(
            { error: 'productId et cost sont requis' },
            { status: 400 }
          )
        }
        profitabilityEngine.setProductCost(productId, cost)
        return NextResponse.json({
          success: true,
          message: `Coût du produit ${productId} mis à jour: ${cost} FCFA`,
        })

      default:
        return NextResponse.json(
          { error: `Action non reconnue: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[API Profitability] Erreur POST:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'opération' },
      { status: 500 }
    )
  }
}
