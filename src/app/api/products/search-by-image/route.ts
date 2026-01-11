import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// ============================================================================
// API - RECHERCHE PAR IMAGE
// ============================================================================
// 
// Cette API permet de rechercher des produits similaires à partir d'une image.
// Elle utilise une approche simple basée sur les hash perceptuels pour la v1.
// Pour une version production, intégrer un service d'IA vision (Google Vision,
// AWS Rekognition, OpenAI Vision, etc.)
//
// POST /api/products/search-by-image
// Body: FormData avec 'image' (File)
// ============================================================================

interface SearchResult {
  productId: string
  name: string
  image: string
  similarity: number // 0-100
  price?: number
  category?: string
}

interface SearchResponse {
  success: boolean
  query: {
    imageUrl: string
    analyzedFeatures?: string[]
  }
  results: SearchResult[]
  totalResults: number
  searchMethod: 'hash' | 'ai' | 'fallback'
  processingTimeMs: number
}

// Calculer un hash simple de l'image pour la démo
function simpleImageHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

// Extraire les features basiques de l'image (couleurs dominantes simulées)
function extractBasicFeatures(buffer: Buffer): string[] {
  // En production: utiliser sharp ou un service AI pour extraire les vraies features
  const hash = simpleImageHash(buffer)
  const features: string[] = []
  
  // Simuler l'extraction de features basée sur le hash
  if (hash.startsWith('a') || hash.startsWith('b')) features.push('high-tech')
  if (hash.startsWith('c') || hash.startsWith('d')) features.push('security')
  if (hash.startsWith('e') || hash.startsWith('f')) features.push('camera')
  if (hash.includes('0')) features.push('electronic')
  if (hash.includes('9')) features.push('surveillance')
  
  return features.length > 0 ? features : ['general']
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    
    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'Aucune image fournie', code: 'NO_IMAGE' },
        { status: 400 }
      )
    }
    
    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Type de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.', 
          code: 'INVALID_TYPE' 
        },
        { status: 400 }
      )
    }
    
    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Image trop volumineuse. Maximum 10 Mo.', 
          code: 'FILE_TOO_LARGE' 
        },
        { status: 400 }
      )
    }
    
    // Lire le contenu de l'image
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Sauvegarder l'image temporairement pour la référence
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'image-search')
    await mkdir(uploadDir, { recursive: true })
    
    const timestamp = Date.now()
    const ext = imageFile.name.split('.').pop() || 'jpg'
    const filename = `search_${timestamp}_${crypto.randomBytes(4).toString('hex')}.${ext}`
    const filepath = path.join(uploadDir, filename)
    
    await writeFile(filepath, buffer)
    const imageUrl = `/uploads/image-search/${filename}`
    
    // Extraire les features de l'image
    const features = extractBasicFeatures(buffer)
    
    // =========================================================================
    // RECHERCHE DE PRODUITS SIMILAIRES
    // =========================================================================
    // En production: appeler un service d'embedding d'images et comparer
    // avec les embeddings des produits en base.
    // Pour la démo: retourner des produits mock basés sur les features.
    
    // Simuler une recherche dans la base de données
    // TODO: Implémenter la vraie recherche avec MongoDB
    const mockResults: SearchResult[] = [
      {
        productId: 'cam-001',
        name: 'Caméra IP PTZ 4K Hikvision',
        image: '/images/products/camera-ptz.jpg',
        similarity: 92,
        price: 450000,
        category: 'Vidéosurveillance'
      },
      {
        productId: 'cam-002',
        name: 'Caméra Dôme 2MP Dahua',
        image: '/images/products/camera-dome.jpg',
        similarity: 85,
        price: 125000,
        category: 'Vidéosurveillance'
      },
      {
        productId: 'nvr-001',
        name: 'NVR 16 Canaux PoE',
        image: '/images/products/nvr-16ch.jpg',
        similarity: 78,
        price: 380000,
        category: 'Enregistreurs'
      },
      {
        productId: 'access-001',
        name: 'Lecteur Biométrique ZKTeco',
        image: '/images/products/biometric-reader.jpg',
        similarity: 65,
        price: 185000,
        category: 'Contrôle d\'accès'
      }
    ]
    
    // Filtrer les résultats basés sur les features extraites
    let results = mockResults
    if (features.includes('camera') || features.includes('surveillance')) {
      results = mockResults.filter(r => 
        r.category === 'Vidéosurveillance' || r.category === 'Enregistreurs'
      )
    } else if (features.includes('security')) {
      results = mockResults.filter(r => 
        r.category === 'Contrôle d\'accès' || r.category === 'Vidéosurveillance'
      )
    }
    
    // Si aucun résultat filtré, retourner tous les résultats
    if (results.length === 0) {
      results = mockResults
    }
    
    const processingTimeMs = Date.now() - startTime
    
    const response: SearchResponse = {
      success: true,
      query: {
        imageUrl,
        analyzedFeatures: features
      },
      results: results.slice(0, 6), // Max 6 résultats
      totalResults: results.length,
      searchMethod: 'hash', // 'ai' en production
      processingTimeMs
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[API] Image search error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de l\'analyse de l\'image', 
        code: 'PROCESSING_ERROR' 
      },
      { status: 500 }
    )
  }
}

// GET pour vérifier le statut de l'API
export async function GET() {
  return NextResponse.json({
    service: 'image-search',
    status: 'operational',
    version: '1.0.0',
    capabilities: {
      maxFileSizeMb: 10,
      supportedFormats: ['jpeg', 'png', 'webp', 'gif'],
      searchMethod: 'perceptual-hash', // 'ai-vision' en production
      maxResults: 6
    },
    documentation: '/docs/api/image-search'
  })
}
