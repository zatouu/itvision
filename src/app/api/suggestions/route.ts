/**
 * API Route - Suggestions de produits
 * 
 * GET /api/suggestions
 * Paramètres:
 * - sessionId (obligatoire): ID de session
 * - userId (optionnel): ID utilisateur connecté
 * - productId (optionnel): Produit actuellement consulté
 * - cartIds (optionnel): IDs des produits dans le panier, séparés par virgule
 * - limit (optionnel): Nombre de suggestions (défaut: 8)
 * 
 * POST /api/suggestions/track
 * Body: { event: 'view' | 'add_to_cart', productId, sessionId, userId? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSuggestionsForApi, suggestionEngine } from '@/lib/engines/suggestion'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId est requis' },
        { status: 400 }
      )
    }

    const userId = searchParams.get('userId') || undefined
    const currentProductId = searchParams.get('productId') || undefined
    const cartIdsParam = searchParams.get('cartIds')
    const cartProductIds = cartIdsParam ? cartIdsParam.split(',').filter(Boolean) : undefined
    const limit = parseInt(searchParams.get('limit') || '8', 10)

    const suggestions = await getSuggestionsForApi(sessionId, {
      userId,
      currentProductId,
      cartProductIds,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: suggestions,
    })

  } catch (error) {
    console.error('[API Suggestions] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des suggestions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, productId, sessionId, userId } = body

    if (!sessionId || !productId) {
      return NextResponse.json(
        { error: 'sessionId et productId sont requis' },
        { status: 400 }
      )
    }

    switch (event) {
      case 'view':
        suggestionEngine.recordView(sessionId, productId)
        break
      case 'add_to_cart':
        // Double le score d'intérêt
        suggestionEngine.recordView(sessionId, productId)
        suggestionEngine.recordView(sessionId, productId)
        break
      case 'purchase':
        if (userId && Array.isArray(body.productIds)) {
          suggestionEngine.recordPurchase(userId, body.productIds)
        }
        break
      default:
        return NextResponse.json(
          { error: `Événement non reconnu: ${event}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Événement ${event} enregistré`,
    })

  } catch (error) {
    console.error('[API Suggestions] Erreur tracking:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de l\'événement' },
      { status: 500 }
    )
  }
}
