/**
 * Script de génération des embeddings d'images pour les produits
 * 
 * Ce script parcourt tous les produits de la base de données,
 * télécharge leurs images et génère des embeddings TensorFlow.js
 * pour activer la recherche par similarité visuelle.
 * 
 * Usage:
 *   npm run generate:embeddings
 *   npm run generate:embeddings -- --limit 100
 *   npm run generate:embeddings -- --category "Vidéosurveillance"
 * 
 * Options:
 *   --limit <n>      Nombre de produits à traiter
 *   --category <cat> Filtrer par catégorie
 *   --force          Régénérer même si l'embedding existe
 *   --dry-run        Ne pas sauvegarder, juste afficher
 */

import { connectMongoose } from '../src/lib/mongoose'
import Product from '../src/lib/models/Product'
import * as tf from '@tensorflow/tfjs-node' // Utiliser le backend Node.js

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_URL = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_1.0_224/model.json'
const INPUT_SIZE = 224
const EMBEDDING_DIMENSION = 1280

// ─────────────────────────────────────────────────────────────────────────────
// Parse CLI arguments
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(): {
  limit: number
  category: string | null
  force: boolean
  dryRun: boolean
} {
  const args = process.argv.slice(2)
  const options = {
    limit: 0, // 0 = tous
    category: null as string | null,
    force: false,
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[++i], 10) || 0
        break
      case '--category':
        options.category = args[++i] || null
        break
      case '--force':
        options.force = true
        break
      case '--dry-run':
        options.dryRun = true
        break
    }
  }

  return options
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Loading
// ─────────────────────────────────────────────────────────────────────────────

async function loadImageFromUrl(url: string): Promise<Buffer | null> {
  try {
    // Gérer les URLs relatives
    if (url.startsWith('/')) {
      url = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${url}`
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      console.warn(`  ⚠️  HTTP ${response.status} for ${url}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.warn(`  ⚠️  Failed to load image: ${url}`)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Extraction
// ─────────────────────────────────────────────────────────────────────────────

let featureModel: tf.LayersModel | null = null

async function loadModel(): Promise<tf.LayersModel> {
  if (featureModel) return featureModel

  console.log('📦 Loading MobileNet model...')
  const baseModel = await tf.loadLayersModel(MODEL_URL)

  // Trouver la couche d'extraction de features
  const layers = baseModel.layers
  let featureLayerName: string | null = null

  for (let i = layers.length - 1; i >= 0; i--) {
    const className = layers[i].getClassName()
    if (className === 'GlobalAveragePooling2D' || className === 'Flatten') {
      featureLayerName = layers[i].name
      break
    }
  }

  if (featureLayerName) {
    const featureLayer = baseModel.getLayer(featureLayerName)
    featureModel = tf.model({
      inputs: baseModel.inputs,
      outputs: featureLayer.output,
    })
    console.log(`✅ Model loaded. Feature layer: ${featureLayerName}`)
  } else {
    featureModel = baseModel
    console.warn('⚠️ Using full model (feature layer not found)')
  }

  return featureModel
}

async function extractFeatures(imageBuffer: Buffer): Promise<number[] | null> {
  try {
    const model = await loadModel()

    // Décoder l'image avec tfjs-node
    const decoded = tf.node.decodeImage(imageBuffer, 3)
    
    // Redimensionner
    const resized = tf.image.resizeBilinear(decoded as tf.Tensor3D, [INPUT_SIZE, INPUT_SIZE])
    
    // Normaliser [-1, 1]
    const normalized = resized.div(127.5).sub(1)
    
    // Ajouter la dimension batch
    const batched = normalized.expandDims(0)
    
    // Extraire les features
    const features = model.predict(batched) as tf.Tensor
    
    // Convertir en array
    const featureArray = Array.from(features.dataSync())
    
    // Normaliser L2
    const norm = Math.sqrt(featureArray.reduce((sum, val) => sum + val * val, 0))
    const normalizedFeatures = norm > 0 ? featureArray.map(val => val / norm) : featureArray

    // Cleanup
    decoded.dispose()
    resized.dispose()
    normalized.dispose()
    batched.dispose()
    features.dispose()

    return normalizedFeatures
  } catch (error) {
    console.warn(`  ⚠️  Feature extraction failed: ${error}`)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Process
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs()
  
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  🔍 TensorFlow.js Image Embedding Generator')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Options:`)
  console.log(`    - Limit: ${options.limit || 'all'}`)
  console.log(`    - Category: ${options.category || 'all'}`)
  console.log(`    - Force: ${options.force}`)
  console.log(`    - Dry run: ${options.dryRun}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Connexion à la base de données
  console.log('🔌 Connecting to MongoDB...')
  await connectMongoose()
  console.log('✅ Connected\n')

  // Charger le modèle
  await loadModel()

  // Construire la requête
  const query: Record<string, unknown> = { isPublished: true }
  
  if (options.category) {
    query.category = options.category
  }
  
  if (!options.force) {
    // Ne traiter que les produits sans embedding
    query.imageEmbedding = { $exists: false }
  }

  // Récupérer les produits
  let productsQuery = Product.find(query)
    .select('name image gallery category imageEmbedding')
    .sort({ createdAt: -1 })

  if (options.limit > 0) {
    productsQuery = productsQuery.limit(options.limit)
  }

  const products = await productsQuery.lean()
  console.log(`📊 Found ${products.length} products to process\n`)

  if (products.length === 0) {
    console.log('✨ Nothing to do!')
    process.exit(0)
  }

  // Statistiques
  let processed = 0
  let success = 0
  let failed = 0
  let skipped = 0

  // Traiter chaque produit
  for (const product of products as any[]) {
    processed++
    const progress = `[${processed}/${products.length}]`
    
    console.log(`${progress} Processing: ${product.name}`)

    // Trouver l'URL de l'image
    const imageUrl = product.image || product.gallery?.[0]
    
    if (!imageUrl) {
      console.log(`  ⏭️  Skipped (no image)`)
      skipped++
      continue
    }

    // Charger l'image
    const imageBuffer = await loadImageFromUrl(imageUrl)
    
    if (!imageBuffer) {
      console.log(`  ❌ Failed (could not load image)`)
      failed++
      continue
    }

    // Extraire les features
    const embedding = await extractFeatures(imageBuffer)
    
    if (!embedding || embedding.length !== EMBEDDING_DIMENSION) {
      console.log(`  ❌ Failed (feature extraction)`)
      failed++
      continue
    }

    // Compresser l'embedding (4 décimales)
    const compressedEmbedding = embedding.map(val => Math.round(val * 10000) / 10000)

    if (options.dryRun) {
      console.log(`  ✅ Success (dry run, embedding size: ${compressedEmbedding.length})`)
      success++
      continue
    }

    // Sauvegarder l'embedding
    try {
      await Product.updateOne(
        { _id: product._id },
        { 
          $set: { 
            imageEmbedding: compressedEmbedding,
            embeddingUpdatedAt: new Date(),
          } 
        }
      )
      console.log(`  ✅ Success (saved)`)
      success++
    } catch (error) {
      console.log(`  ❌ Failed (save error): ${error}`)
      failed++
    }

    // Pause pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Résumé
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  📈 Summary')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  ✅ Success: ${success}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  📊 Total processed: ${processed}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Cleanup
  if (featureModel) {
    featureModel.dispose()
  }

  process.exit(failed > 0 ? 1 : 0)
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
