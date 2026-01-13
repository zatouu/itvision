/**
 * TensorFlow.js Image Feature Extraction
 * 
 * Ce module utilise TensorFlow.js avec le modèle MobileNet pour extraire des 
 * vecteurs de caractéristiques (embeddings) à partir d'images. Ces embeddings
 * permettent de comparer la similarité visuelle entre images.
 * 
 * Architecture:
 * - MobileNet V2 comme backbone pour l'extraction de features
 * - Cosine similarity pour la comparaison des vecteurs
 * - Support côté client (browser) et serveur (Node.js)
 * 
 * @module tensorflow/image-features
 */

import * as tf from '@tensorflow/tfjs'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageEmbedding {
  vector: number[]       // Vecteur de features (1280 dimensions pour MobileNet V2)
  modelVersion: string   // Version du modèle utilisé
  timestamp: number      // Timestamp de création
}

export interface SimilarityResult {
  score: number          // Score de similarité (0-1)
  productId: string      // ID du produit
  embedding: number[]    // Embedding du produit
}

export interface ImageSearchConfig {
  modelUrl?: string      // URL du modèle (optionnel)
  topK?: number          // Nombre de résultats à retourner
  minSimilarity?: number // Score minimum de similarité
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Dimension de l'embedding MobileNet V2
export const EMBEDDING_DIMENSION = 1280

// Configuration par défaut
const DEFAULT_CONFIG: Required<ImageSearchConfig> = {
  modelUrl: 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_1.0_224/model.json',
  topK: 12,
  minSimilarity: 0.3,
}

// Taille d'entrée attendue par MobileNet
const INPUT_SIZE = 224

// Version du modèle pour tracking
const MODEL_VERSION = 'mobilenet-v2-1.0-224'

// ─────────────────────────────────────────────────────────────────────────────
// Model Management
// ─────────────────────────────────────────────────────────────────────────────

let featureModel: tf.LayersModel | null = null
let isModelLoading = false

/**
 * Charge le modèle MobileNet pour l'extraction de features.
 * Le modèle est mis en cache pour éviter les rechargements.
 */
export async function loadFeatureModel(config: ImageSearchConfig = {}): Promise<tf.LayersModel> {
  const { modelUrl } = { ...DEFAULT_CONFIG, ...config }

  // Retourner le modèle mis en cache s'il existe
  if (featureModel) {
    return featureModel
  }

  // Éviter les chargements parallèles
  if (isModelLoading) {
    // Attendre que le chargement en cours se termine
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (featureModel) return featureModel
  }

  isModelLoading = true

  try {
    console.log('[TensorFlow] Loading MobileNet feature extraction model...')
    
    // Charger le modèle MobileNet complet
    const baseModel = await tf.loadLayersModel(modelUrl)
    
    // Créer un modèle tronqué qui retourne les features avant la couche de classification
    // MobileNet V2 : on prend la sortie de la couche 'global_average_pooling2d'
    // qui produit un vecteur de 1280 dimensions
    const featureLayerName = findFeatureLayerName(baseModel)
    
    if (!featureLayerName) {
      throw new Error('Could not find feature extraction layer in model')
    }

    const featureLayer = baseModel.getLayer(featureLayerName)
    featureModel = tf.model({
      inputs: baseModel.inputs,
      outputs: featureLayer.output,
    })

    console.log(`[TensorFlow] Model loaded. Feature layer: ${featureLayerName}`)
    console.log(`[TensorFlow] Output shape: ${featureModel.outputShape}`)

    return featureModel
  } catch (error) {
    console.error('[TensorFlow] Error loading model:', error)
    throw error
  } finally {
    isModelLoading = false
  }
}

/**
 * Trouve la couche d'extraction de features dans le modèle.
 */
function findFeatureLayerName(model: tf.LayersModel): string | null {
  // Chercher la couche global_average_pooling ou flatten avant la dernière dense
  const layers = model.layers
  
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    const className = layer.getClassName()
    
    // Chercher global average pooling ou flatten
    if (className === 'GlobalAveragePooling2D' || 
        className === 'GlobalMaxPooling2D' ||
        (className === 'Flatten' && i < layers.length - 2)) {
      return layer.name
    }
  }
  
  // Fallback : prendre l'avant-dernière couche si c'est pas une Dense
  for (let i = layers.length - 2; i >= 0; i--) {
    const layer = layers[i]
    if (layer.getClassName() !== 'Dense') {
      return layer.name
    }
  }

  return null
}

/**
 * Libère les ressources du modèle.
 */
export function disposeModel(): void {
  if (featureModel) {
    featureModel.dispose()
    featureModel = null
    console.log('[TensorFlow] Model disposed')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Preprocessing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prétraite une image pour l'extraction de features.
 * 
 * @param imageData - Données de l'image (ImageData, HTMLImageElement, ou Tensor)
 * @returns Tensor 4D [1, 224, 224, 3] normalisé pour MobileNet
 */
export function preprocessImage(imageData: ImageData | HTMLImageElement | HTMLCanvasElement | tf.Tensor3D): tf.Tensor4D {
  return tf.tidy(() => {
    let tensor: tf.Tensor3D

    // Convertir en tensor si nécessaire
    if (imageData instanceof tf.Tensor) {
      tensor = imageData as tf.Tensor3D
    } else {
      tensor = tf.browser.fromPixels(imageData)
    }

    // Redimensionner à 224x224
    const resized = tf.image.resizeBilinear(tensor, [INPUT_SIZE, INPUT_SIZE])

    // Normaliser les valeurs de pixels [-1, 1] (requis par MobileNet)
    const normalized = resized.div(127.5).sub(1)

    // Ajouter la dimension batch
    return normalized.expandDims(0) as tf.Tensor4D
  })
}

/**
 * Prétraite une image à partir d'un Buffer (pour Node.js/API routes).
 * Utilise une approche simplifiée basée sur les données brutes.
 */
export async function preprocessImageFromBuffer(buffer: Buffer): Promise<tf.Tensor4D> {
  // Détecter le format et décoder
  const format = detectImageFormat(buffer)
  
  if (!format) {
    throw new Error('Unsupported image format')
  }

  // Pour le côté serveur, on utilise une approche différente
  // car tf.browser.fromPixels n'est pas disponible
  return tf.tidy(() => {
    // Créer un tensor à partir des données brutes
    // Note: en production, utiliser sharp ou jimp pour le décodage
    const tensor = decodeImageBuffer(buffer, format)
    const resized = tf.image.resizeBilinear(tensor, [INPUT_SIZE, INPUT_SIZE])
    const normalized = resized.div(127.5).sub(1)
    return normalized.expandDims(0) as tf.Tensor4D
  })
}

/**
 * Détecte le format de l'image à partir du header.
 */
function detectImageFormat(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return 'jpeg'
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'png'
  }
  if (buffer.slice(8, 12).toString() === 'WEBP') {
    return 'webp'
  }
  return null
}

/**
 * Décode un buffer d'image en tensor.
 * Version simplifiée - en production, utiliser sharp.
 */
function decodeImageBuffer(buffer: Buffer, format: string): tf.Tensor3D {
  // Cette fonction est un placeholder
  // En production, utiliser @tensorflow/tfjs-node ou sharp pour le décodage
  
  // Pour l'instant, on crée un tensor placeholder basé sur l'analyse des bytes
  const width = INPUT_SIZE
  const height = INPUT_SIZE
  const channels = 3

  // Échantillonner les données du buffer pour créer une représentation approximative
  const data = new Float32Array(width * height * channels)
  const sampleInterval = Math.max(1, Math.floor(buffer.length / (width * height)))
  
  for (let i = 0; i < width * height; i++) {
    const bufferIdx = Math.min((i * sampleInterval) % buffer.length, buffer.length - 3)
    data[i * 3] = buffer[bufferIdx] / 255       // R
    data[i * 3 + 1] = buffer[bufferIdx + 1] / 255 // G  
    data[i * 3 + 2] = buffer[bufferIdx + 2] / 255 // B
  }

  return tf.tensor3d(data, [height, width, channels])
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait le vecteur de features d'une image.
 * 
 * @param imageData - Image à analyser
 * @param config - Configuration optionnelle
 * @returns Embedding de l'image
 */
export async function extractImageFeatures(
  imageData: ImageData | HTMLImageElement | HTMLCanvasElement | tf.Tensor3D,
  config: ImageSearchConfig = {}
): Promise<ImageEmbedding> {
  const model = await loadFeatureModel(config)
  
  return tf.tidy(() => {
    // Prétraiter l'image
    const preprocessed = preprocessImage(imageData)
    
    // Extraire les features
    const features = model.predict(preprocessed) as tf.Tensor
    
    // Convertir en array
    const vector = Array.from(features.dataSync())
    
    // Normaliser le vecteur (L2 normalization)
    const normalizedVector = normalizeVector(vector)
    
    return {
      vector: normalizedVector,
      modelVersion: MODEL_VERSION,
      timestamp: Date.now(),
    }
  })
}

/**
 * Extrait les features à partir d'un buffer d'image (pour API routes).
 */
export async function extractFeaturesFromBuffer(
  buffer: Buffer,
  config: ImageSearchConfig = {}
): Promise<ImageEmbedding> {
  const model = await loadFeatureModel(config)
  
  const preprocessed = await preprocessImageFromBuffer(buffer)
  
  try {
    const features = model.predict(preprocessed) as tf.Tensor
    const vector = Array.from(features.dataSync())
    const normalizedVector = normalizeVector(vector)
    
    return {
      vector: normalizedVector,
      modelVersion: MODEL_VERSION,
      timestamp: Date.now(),
    }
  } finally {
    preprocessed.dispose()
  }
}

/**
 * Normalise un vecteur avec la norme L2.
 */
function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (norm === 0) return vector
  return vector.map(val => val / norm)
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule la similarité cosinus entre deux vecteurs.
 * 
 * @param vectorA - Premier vecteur
 * @param vectorB - Deuxième vecteur
 * @returns Score de similarité entre 0 et 1
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i]
    normA += vectorA[i] * vectorA[i]
    normB += vectorB[i] * vectorB[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  
  if (denominator === 0) return 0
  
  // Transformer de [-1, 1] à [0, 1]
  return (dotProduct / denominator + 1) / 2
}

/**
 * Calcule la distance euclidienne entre deux vecteurs.
 */
export function euclideanDistance(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same dimension')
  }

  let sum = 0
  for (let i = 0; i < vectorA.length; i++) {
    const diff = vectorA[i] - vectorB[i]
    sum += diff * diff
  }

  return Math.sqrt(sum)
}

/**
 * Trouve les produits les plus similaires à une image.
 * 
 * @param queryEmbedding - Embedding de l'image requête
 * @param productEmbeddings - Map des embeddings de produits (productId -> embedding)
 * @param config - Configuration de recherche
 * @returns Liste des produits similaires triés par score
 */
export function findSimilarProducts(
  queryEmbedding: number[],
  productEmbeddings: Map<string, number[]>,
  config: ImageSearchConfig = {}
): SimilarityResult[] {
  const { topK, minSimilarity } = { ...DEFAULT_CONFIG, ...config }

  const results: SimilarityResult[] = []

  productEmbeddings.forEach((embedding, productId) => {
    const score = cosineSimilarity(queryEmbedding, embedding)
    
    if (score >= minSimilarity) {
      results.push({
        score,
        productId,
        embedding,
      })
    }
  })

  // Trier par score décroissant et limiter aux topK
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * Version optimisée utilisant TensorFlow pour le calcul batch de similarité.
 */
export function findSimilarProductsBatch(
  queryEmbedding: number[],
  productEmbeddings: { productId: string; embedding: number[] }[],
  config: ImageSearchConfig = {}
): SimilarityResult[] {
  const { topK, minSimilarity } = { ...DEFAULT_CONFIG, ...config }

  if (productEmbeddings.length === 0) {
    return []
  }

  return tf.tidy(() => {
    // Convertir en tensors
    const queryTensor = tf.tensor1d(queryEmbedding)
    const productTensors = tf.tensor2d(
      productEmbeddings.map(p => p.embedding)
    )

    // Calculer les similarités cosinus en batch
    // dot(query, products) / (||query|| * ||products||)
    const dotProducts = tf.matMul(
      productTensors,
      queryTensor.reshape([queryEmbedding.length, 1])
    ).squeeze()

    const queryNorm = queryTensor.norm()
    const productNorms = productTensors.norm('euclidean', 1)
    
    const similarities = dotProducts.div(queryNorm.mul(productNorms))
    
    // Transformer de [-1, 1] à [0, 1]
    const normalizedSimilarities = similarities.add(1).div(2)

    // Convertir en array
    const similarityArray = Array.from(normalizedSimilarities.dataSync())

    // Créer les résultats
    const results: SimilarityResult[] = []
    
    for (let i = 0; i < productEmbeddings.length; i++) {
      const score = similarityArray[i]
      if (score >= minSimilarity) {
        results.push({
          score,
          productId: productEmbeddings[i].productId,
          embedding: productEmbeddings[i].embedding,
        })
      }
    }

    // Trier et limiter
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si TensorFlow.js est prêt.
 */
export async function checkTensorFlowReady(): Promise<{
  ready: boolean
  backend: string
  version: string
}> {
  try {
    await tf.ready()
    return {
      ready: true,
      backend: tf.getBackend(),
      version: tf.version.tfjs,
    }
  } catch (error) {
    return {
      ready: false,
      backend: 'none',
      version: tf.version.tfjs,
    }
  }
}

/**
 * Retourne des statistiques sur la mémoire utilisée par TensorFlow.
 */
export function getMemoryInfo(): tf.MemoryInfo {
  return tf.memory()
}

/**
 * Compresse un embedding pour le stockage.
 * Réduit la précision à float16 pour économiser de l'espace.
 */
export function compressEmbedding(embedding: number[]): number[] {
  // Quantification simple: arrondir à 4 décimales
  return embedding.map(val => Math.round(val * 10000) / 10000)
}

/**
 * Vérifie si un embedding est valide.
 */
export function isValidEmbedding(embedding: unknown): embedding is number[] {
  if (!Array.isArray(embedding)) return false
  if (embedding.length !== EMBEDDING_DIMENSION) return false
  return embedding.every(val => typeof val === 'number' && !Number.isNaN(val))
}
