import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Catégories de produits avec mots-clés associés pour la recherche
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Vidéosurveillance': ['camera', 'caméra', 'surveillance', 'nvr', 'dvr', 'hikvision', 'dahua', 'ptz', 'dome', 'bullet', 'turret', 'cctv'],
  'Contrôle d\'Accès': ['access', 'accès', 'biometric', 'biométrique', 'facial', 'empreinte', 'fingerprint', 'badge', 'rfid', 'terminal'],
  'Alarme': ['alarm', 'alarme', 'détecteur', 'detector', 'sirène', 'siren', 'ax pro', 'hub', 'capteur', 'sensor'],
  'Réseau': ['switch', 'routeur', 'router', 'poe', 'network', 'réseau', 'ethernet', 'fiber', 'fibre', 'wifi'],
  'Domotique': ['smart', 'intelligent', 'home', 'maison', 'zigbee', 'interrupteur', 'capteur', 'automation'],
  'Visiophonie': ['interphone', 'visiophone', 'doorbell', 'sonnette', 'portier', 'moniteur', 'écran'],
}

// Couleurs dominantes pour la correspondance visuelle
const COLOR_KEYWORDS: Record<string, string[]> = {
  'white': ['blanc', 'white', 'clair', 'light'],
  'black': ['noir', 'black', 'dark', 'sombre'],
  'gray': ['gris', 'gray', 'grey', 'metal', 'métallique'],
  'silver': ['argent', 'silver', 'chrome', 'aluminium'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Extraire des caractéristiques basiques de l'image
// (Version simplifiée - en production, utiliser une API de vision IA)
// ─────────────────────────────────────────────────────────────────────────────

interface ImageFeatures {
  dominantColors: string[]
  detectedCategories: string[]
  aspectRatio: 'square' | 'landscape' | 'portrait'
  brightness: 'dark' | 'medium' | 'bright'
}

async function extractImageFeatures(imageBuffer: Buffer): Promise<ImageFeatures> {
  // Version simplifiée : on analyse les premiers bytes pour détecter le format
  // En production, intégrer Google Vision API, AWS Rekognition, ou un modèle local
  
  const features: ImageFeatures = {
    dominantColors: [],
    detectedCategories: [],
    aspectRatio: 'square',
    brightness: 'medium',
  }

  // Détection basique du format d'image
  const header = imageBuffer.slice(0, 12)
  const isJPEG = header[0] === 0xFF && header[1] === 0xD8
  const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47
  const isWebP = header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50

  if (!isJPEG && !isPNG && !isWebP) {
    throw new Error('Format d\'image non supporté')
  }

  // Analyse basique des couleurs (échantillonnage simplifié)
  // Pour une vraie implémentation, utiliser sharp ou une API de vision
  const sampleSize = Math.min(1000, imageBuffer.length)
  let darkPixels = 0
  let lightPixels = 0
  
  for (let i = 0; i < sampleSize; i += 3) {
    const value = imageBuffer[i]
    if (value < 85) darkPixels++
    else if (value > 170) lightPixels++
  }

  const ratio = darkPixels / (darkPixels + lightPixels + 1)
  if (ratio > 0.6) {
    features.brightness = 'dark'
    features.dominantColors.push('black', 'gray')
  } else if (ratio < 0.3) {
    features.brightness = 'bright'
    features.dominantColors.push('white', 'silver')
  } else {
    features.dominantColors.push('gray', 'white')
  }

  // Catégories par défaut (en production, utiliser la détection d'objets)
  // On suppose des produits de sécurité/tech par défaut
  features.detectedCategories = ['Vidéosurveillance', 'Contrôle d\'Accès', 'Réseau']

  return features
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Calculer le score de similarité
// ─────────────────────────────────────────────────────────────────────────────

function calculateSimilarityScore(
  product: any,
  features: ImageFeatures,
  searchText?: string
): number {
  let score = 0
  const maxScore = 100

  // 1. Correspondance de catégorie (40 points max)
  const productCategory = product.category?.toLowerCase() || ''
  const productName = product.name?.toLowerCase() || ''
  const productDescription = product.description?.toLowerCase() || ''

  for (const detectedCat of features.detectedCategories) {
    const keywords = CATEGORY_KEYWORDS[detectedCat] || []
    for (const keyword of keywords) {
      if (productCategory.includes(keyword) || productName.includes(keyword)) {
        score += 15
        break
      }
      if (productDescription.includes(keyword)) {
        score += 5
      }
    }
  }
  score = Math.min(score, 40)

  // 2. Correspondance de couleur (20 points max)
  for (const color of features.dominantColors) {
    const colorKeywords = COLOR_KEYWORDS[color] || [color]
    for (const keyword of colorKeywords) {
      if (productName.includes(keyword) || productDescription.includes(keyword)) {
        score += 10
        break
      }
    }
  }
  score = Math.min(score, 60) // Cap à 60 après couleurs

  // 3. Produits vedettes et populaires (15 points)
  if (product.isFeatured) score += 10
  if (product.isPublished) score += 5

  // 4. Disponibilité (10 points)
  if (product.stockStatus === 'in_stock') score += 10
  else if (product.stockStatus === 'preorder') score += 5

  // 5. A une image (15 points) - plus crédible pour la recherche visuelle
  if (product.image || (product.gallery && product.gallery.length > 0)) {
    score += 15
  }

  // 6. Recherche textuelle optionnelle (bonus)
  if (searchText) {
    const searchLower = searchText.toLowerCase()
    if (productName.includes(searchLower)) score += 20
    if (productDescription.includes(searchLower)) score += 10
    if (productCategory.includes(searchLower)) score += 10
  }

  return Math.min(score, maxScore)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/catalog/search-by-image
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const searchText = formData.get('searchText') as string | null

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'Aucune image fournie' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Le fichier doit être une image' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'L\'image ne doit pas dépasser 5 Mo' },
        { status: 400 }
      )
    }

    // Convertir en buffer pour l'analyse
    const arrayBuffer = await imageFile.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // Extraire les caractéristiques de l'image
    let features: ImageFeatures
    try {
      features = await extractImageFeatures(imageBuffer)
    } catch (err) {
      console.error('Error extracting image features:', err)
      return NextResponse.json(
        { success: false, error: 'Impossible d\'analyser l\'image' },
        { status: 400 }
      )
    }

    // Connexion à la base de données
    await connectMongoose()

    // Récupérer les produits publiés
    const products = await Product.find({ isPublished: true })
      .select('name category description image gallery price baseCost currency stockStatus isFeatured isPublished colorOptions')
      .lean()

    // Calculer les scores de similarité
    const scoredProducts = products.map((product: any) => ({
      id: product._id.toString(),
      name: product.name,
      image: product.image || product.gallery?.[0] || null,
      category: product.category || null,
      priceAmount: product.price || product.baseCost || null,
      currency: product.currency || 'FCFA',
      similarity: calculateSimilarityScore(product, features, searchText || undefined),
    }))

    // Trier par score décroissant et filtrer les scores trop bas
    const results = scoredProducts
      .filter(p => p.similarity >= 20) // Seuil minimum de similarité
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 12) // Limiter à 12 résultats

    return NextResponse.json({
      success: true,
      results,
      meta: {
        totalAnalyzed: products.length,
        matchesFound: results.length,
        detectedCategories: features.detectedCategories,
        dominantColors: features.dominantColors,
      }
    })

  } catch (error) {
    console.error('Image search error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la recherche par image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - Info sur l'endpoint
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/catalog/search-by-image',
    method: 'POST',
    description: 'Recherche de produits par image',
    accepts: 'multipart/form-data',
    fields: {
      image: 'File (required) - Image JPG, PNG ou WebP, max 5Mo',
      searchText: 'String (optional) - Texte de recherche complémentaire'
    },
    returns: {
      success: 'boolean',
      results: 'Array<{ id, name, image, category, priceAmount, currency, similarity }>',
      meta: '{ totalAnalyzed, matchesFound, detectedCategories, dominantColors }'
    }
  })
}
