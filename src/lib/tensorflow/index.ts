/**
 * TensorFlow.js Module - Image Search
 * 
 * Ce module fournit des utilitaires pour la recherche d'images par similarité
 * visuelle en utilisant TensorFlow.js et le modèle MobileNet.
 * 
 * @example
 * // Côté client (React)
 * import { useImageSearch } from '@/lib/tensorflow'
 * 
 * function SearchComponent() {
 *   const { searchByImage, results, isSearching } = useImageSearch()
 *   // ...
 * }
 * 
 * @example
 * // Côté serveur (API routes)
 * import { extractFeaturesFromBuffer, cosineSimilarity } from '@/lib/tensorflow'
 * 
 * async function handler(buffer: Buffer) {
 *   const embedding = await extractFeaturesFromBuffer(buffer)
 *   // ...
 * }
 * 
 * @module tensorflow
 */

// Feature extraction and similarity computation
export {
  // Types
  type ImageEmbedding,
  type SimilarityResult,
  type ImageSearchConfig,
  
  // Constants
  EMBEDDING_DIMENSION,
  
  // Model management
  loadFeatureModel,
  disposeModel,
  
  // Preprocessing
  preprocessImage,
  preprocessImageFromBuffer,
  
  // Feature extraction
  extractImageFeatures,
  extractFeaturesFromBuffer,
  
  // Similarity computation
  cosineSimilarity,
  euclideanDistance,
  findSimilarProducts,
  findSimilarProductsBatch,
  
  // Utilities
  checkTensorFlowReady,
  getMemoryInfo,
  compressEmbedding,
  isValidEmbedding,
} from './image-features'

// React hook for client-side image search
export {
  useImageSearch,
  type ImageSearchResult,
  type UseImageSearchOptions,
  type ImageSearchState,
} from './use-image-search'
