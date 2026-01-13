/**
 * TensorFlow.js Image Search - Client-side Hook
 * 
 * Ce hook React fournit une interface pour la recherche d'images côté client.
 * Il gère le chargement du modèle TensorFlow.js, l'extraction de features,
 * et la communication avec l'API backend.
 * 
 * @module tensorflow/use-image-search
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import * as tf from '@tensorflow/tfjs'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageSearchResult {
  id: string
  name: string
  image: string | null
  category: string | null
  priceAmount: number | null
  currency: string
  similarity: number // Score 0-100
}

export interface UseImageSearchOptions {
  /** URL du modèle TensorFlow.js (optionnel, utilise MobileNet par défaut) */
  modelUrl?: string
  /** Nombre maximum de résultats */
  maxResults?: number
  /** Score minimum de similarité (0-1) */
  minSimilarity?: number
  /** Utiliser le backend WebGL pour de meilleures performances */
  useWebGL?: boolean
  /** Activer le mode hybride (client + serveur) */
  hybridMode?: boolean
}

export interface ImageSearchState {
  /** Indique si le modèle est en cours de chargement */
  isLoading: boolean
  /** Indique si une recherche est en cours */
  isSearching: boolean
  /** Indique si le modèle est prêt */
  isModelReady: boolean
  /** Erreur éventuelle */
  error: string | null
  /** Résultats de la recherche */
  results: ImageSearchResult[]
  /** Progression du chargement (0-100) */
  progress: number
  /** Backend TensorFlow utilisé */
  backend: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL_URL = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_1.0_224/model.json'
const INPUT_SIZE = 224
const EMBEDDING_DIMENSION = 1280

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useImageSearch(options: UseImageSearchOptions = {}) {
  const {
    modelUrl = DEFAULT_MODEL_URL,
    maxResults = 12,
    minSimilarity = 0.3,
    useWebGL = true,
    hybridMode = true,
  } = options

  // State
  const [state, setState] = useState<ImageSearchState>({
    isLoading: false,
    isSearching: false,
    isModelReady: false,
    error: null,
    results: [],
    progress: 0,
    backend: null,
  })

  // Refs
  const modelRef = useRef<tf.LayersModel | null>(null)
  const featureModelRef = useRef<tf.LayersModel | null>(null)

  // ─── Initialize TensorFlow ────────────────────────────────────────────────

  useEffect(() => {
    const initializeTensorFlow = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, progress: 10 }))

        // Configurer le backend
        await tf.ready()
        
        if (useWebGL && tf.getBackend() !== 'webgl') {
          try {
            await tf.setBackend('webgl')
          } catch {
            console.warn('[TensorFlow] WebGL not available, using CPU backend')
          }
        }

        setState(prev => ({ 
          ...prev, 
          progress: 30,
          backend: tf.getBackend() 
        }))

        console.log(`[TensorFlow] Initialized with backend: ${tf.getBackend()}`)

      } catch (error) {
        console.error('[TensorFlow] Initialization error:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Erreur d\'initialisation de TensorFlow.js'
        }))
      }
    }

    initializeTensorFlow()

    // Cleanup
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose()
        modelRef.current = null
      }
      if (featureModelRef.current) {
        featureModelRef.current.dispose()
        featureModelRef.current = null
      }
    }
  }, [useWebGL])

  // ─── Load Model ───────────────────────────────────────────────────────────

  const loadModel = useCallback(async () => {
    if (modelRef.current) {
      setState(prev => ({ ...prev, isModelReady: true }))
      return true
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, progress: 40, error: null }))

      console.log('[TensorFlow] Loading MobileNet model...')

      // Charger le modèle MobileNet
      const baseModel = await tf.loadLayersModel(modelUrl)
      modelRef.current = baseModel

      setState(prev => ({ ...prev, progress: 70 }))

      // Créer le modèle d'extraction de features
      // Trouver la couche avant la classification
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
        featureModelRef.current = tf.model({
          inputs: baseModel.inputs,
          outputs: featureLayer.output,
        })
        console.log(`[TensorFlow] Feature model created. Layer: ${featureLayerName}`)
      } else {
        // Fallback: utiliser l'avant-dernière couche
        featureModelRef.current = baseModel
        console.warn('[TensorFlow] Using full model for feature extraction')
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isModelReady: true,
        progress: 100 
      }))

      console.log('[TensorFlow] Model ready!')
      return true

    } catch (error) {
      console.error('[TensorFlow] Model loading error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de chargement du modèle d\'IA'
      }))
      return false
    }
  }, [modelUrl])

  // ─── Extract Features ─────────────────────────────────────────────────────

  const extractFeatures = useCallback(async (
    imageElement: HTMLImageElement | HTMLCanvasElement | ImageData
  ): Promise<number[] | null> => {
    const model = featureModelRef.current

    if (!model) {
      console.error('[TensorFlow] Model not loaded')
      return null
    }

    try {
      return tf.tidy(() => {
        // Convertir l'image en tensor
        let tensor = tf.browser.fromPixels(imageElement)
        
        // Redimensionner à 224x224
        tensor = tf.image.resizeBilinear(tensor, [INPUT_SIZE, INPUT_SIZE])
        
        // Normaliser [-1, 1]
        tensor = tensor.div(127.5).sub(1)
        
        // Ajouter la dimension batch
        const batched = tensor.expandDims(0)
        
        // Extraire les features
        const features = model.predict(batched) as tf.Tensor
        
        // Convertir en array et normaliser (L2)
        const featureArray = Array.from(features.dataSync())
        const norm = Math.sqrt(featureArray.reduce((sum, val) => sum + val * val, 0))
        
        return norm > 0 ? featureArray.map(val => val / norm) : featureArray
      })
    } catch (error) {
      console.error('[TensorFlow] Feature extraction error:', error)
      return null
    }
  }, [])

  // ─── Search by Image ──────────────────────────────────────────────────────

  const searchByImage = useCallback(async (
    imageSource: File | HTMLImageElement | HTMLCanvasElement | string
  ): Promise<ImageSearchResult[]> => {
    setState(prev => ({ ...prev, isSearching: true, error: null, results: [] }))

    try {
      // Mode hybride: envoyer l'image au serveur pour la recherche
      if (hybridMode && imageSource instanceof File) {
        const formData = new FormData()
        formData.append('image', imageSource)

        const response = await fetch('/api/catalog/search-by-image', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erreur de recherche')
        }

        setState(prev => ({
          ...prev,
          isSearching: false,
          results: data.results || [],
        }))

        return data.results || []
      }

      // Mode client: extraire les features localement
      // D'abord charger le modèle si nécessaire
      if (!featureModelRef.current) {
        const loaded = await loadModel()
        if (!loaded) {
          throw new Error('Impossible de charger le modèle')
        }
      }

      // Charger l'image si c'est une URL ou un File
      let imageElement: HTMLImageElement | HTMLCanvasElement

      if (typeof imageSource === 'string') {
        imageElement = await loadImageFromUrl(imageSource)
      } else if (imageSource instanceof File) {
        imageElement = await loadImageFromFile(imageSource)
      } else {
        imageElement = imageSource
      }

      // Extraire les features
      const features = await extractFeatures(imageElement)

      if (!features) {
        throw new Error('Impossible d\'extraire les caractéristiques de l\'image')
      }

      // Envoyer les features au serveur pour la recherche
      const response = await fetch('/api/catalog/search-by-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: features,
          topK: maxResults,
          minSimilarity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de recherche')
      }

      setState(prev => ({
        ...prev,
        isSearching: false,
        results: data.results || [],
      }))

      return data.results || []

    } catch (error) {
      console.error('[ImageSearch] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur de recherche'
      
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: errorMessage,
      }))

      return []
    }
  }, [hybridMode, loadModel, extractFeatures, maxResults, minSimilarity])

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      error: null,
      isSearching: false,
    }))
  }, [])

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    ...state,
    loadModel,
    searchByImage,
    extractFeatures,
    reset,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge une image à partir d'une URL.
 */
async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

/**
 * Charge une image à partir d'un fichier.
 */
async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to decode image'))
      img.src = reader.result as string
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Export default
// ─────────────────────────────────────────────────────────────────────────────

export default useImageSearch
