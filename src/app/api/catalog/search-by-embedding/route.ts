import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import {
  cosineSimilarity,
  isValidEmbedding,
  EMBEDDING_DIMENSION,
} from '@/lib/tensorflow'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SearchByEmbeddingRequest {
  embedding: number[]
  topK?: number
  minSimilarity?: number
  categoryFilter?: string
}

interface SearchResult {
  id: string
  name: string
  image: string | null
  category: string | null
  priceAmount: number | null
  currency: string
  similarity: number // Score 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/catalog/search-by-embedding
// Recherche de produits par vecteur d'embedding (features TensorFlow.js)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SearchByEmbeddingRequest
    const { 
      embedding, 
      topK = 12, 
      minSimilarity = 0.3,
      categoryFilter 
    } = body

    // Validation de l'embedding
    if (!embedding) {
      return NextResponse.json(
        { success: false, error: 'Embedding requis' },
        { status: 400 }
      )
    }

    if (!isValidEmbedding(embedding)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Embedding invalide. Attendu: tableau de ${EMBEDDING_DIMENSION} nombres` 
        },
        { status: 400 }
      )
    }

    // Connexion à la base de données
    await connectMongoose()

    // Construire la requête
    const query: Record<string, unknown> = { isPublished: true }
    if (categoryFilter) {
      query.category = categoryFilter
    }

    // Récupérer les produits avec leurs embeddings
    const products = await Product.find(query)
      .select('name category description image gallery price baseCost currency stockStatus isFeatured imageEmbedding')
      .lean()

    // Calculer les similarités
    const results: SearchResult[] = []

    for (const product of products as any[]) {
      let similarity = 0

      // Si le produit a un embedding stocké, utiliser la similarité cosinus
      if (product.imageEmbedding && Array.isArray(product.imageEmbedding) && product.imageEmbedding.length === EMBEDDING_DIMENSION) {
        similarity = cosineSimilarity(embedding, product.imageEmbedding)
      } else {
        // Fallback: score basé sur les métadonnées (moins précis)
        similarity = calculateFallbackSimilarity(product)
      }

      // Ne garder que les résultats au-dessus du seuil
      if (similarity >= minSimilarity) {
        results.push({
          id: product._id.toString(),
          name: product.name,
          image: product.image || product.gallery?.[0] || null,
          category: product.category || null,
          priceAmount: product.price || product.baseCost || null,
          currency: product.currency || 'FCFA',
          similarity: Math.round(similarity * 100), // Convertir en pourcentage
        })
      }
    }

    // Trier par similarité décroissante
    results.sort((a, b) => b.similarity - a.similarity)

    // Limiter aux topK résultats
    const topResults = results.slice(0, topK)

    return NextResponse.json({
      success: true,
      results: topResults,
      meta: {
        totalAnalyzed: products.length,
        matchesFound: results.length,
        returnedCount: topResults.length,
        hasEmbeddings: products.filter((p: any) => p.imageEmbedding).length,
      }
    })

  } catch (error) {
    console.error('Embedding search error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la recherche par embedding',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Score de similarité de fallback basé sur les métadonnées
// ─────────────────────────────────────────────────────────────────────────────

function calculateFallbackSimilarity(product: any): number {
  let score = 0.3 // Score de base

  // Produits vedettes
  if (product.isFeatured) score += 0.1

  // Disponibilité
  if (product.stockStatus === 'in_stock') score += 0.1
  else if (product.stockStatus === 'preorder') score += 0.05

  // A une image
  if (product.image || (product.gallery && product.gallery.length > 0)) {
    score += 0.1
  }

  // Plafonner à 0.6 pour les produits sans embedding
  return Math.min(score, 0.6)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - Info sur l'endpoint
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/catalog/search-by-embedding',
    method: 'POST',
    description: 'Recherche de produits par vecteur d\'embedding (TensorFlow.js)',
    accepts: 'application/json',
    body: {
      embedding: `Array<number> (required) - Vecteur de features, ${EMBEDDING_DIMENSION} dimensions`,
      topK: 'number (optional, default: 12) - Nombre max de résultats',
      minSimilarity: 'number (optional, default: 0.3) - Score minimum (0-1)',
      categoryFilter: 'string (optional) - Filtrer par catégorie'
    },
    returns: {
      success: 'boolean',
      results: 'Array<{ id, name, image, category, priceAmount, currency, similarity }>',
      meta: '{ totalAnalyzed, matchesFound, returnedCount, hasEmbeddings }'
    },
    notes: [
      'Les produits avec un embedding stocké utilisent la similarité cosinus (précis)',
      'Les produits sans embedding utilisent un score de fallback (moins précis)',
      'Utilisez le script de génération d\'embeddings pour améliorer les résultats'
    ]
  })
}
