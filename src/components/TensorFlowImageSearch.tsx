'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  Camera,
  Upload,
  X,
  Search,
  Loader2,
  ImageIcon,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Cpu,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { useImageSearch, type ImageSearchResult } from '@/lib/tensorflow'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TensorFlowImageSearchProps {
  isOpen: boolean
  onClose: () => void
  onResultsFound?: (results: ImageSearchResult[]) => void
  onProductSelect?: (productId: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TensorFlowImageSearch({
  isOpen,
  onClose,
  onResultsFound,
  onProductSelect,
}: TensorFlowImageSearchProps) {
  // ─── Image Search Hook ─────────────────────────────────────────────────────
  const {
    isLoading: modelLoading,
    isSearching,
    isModelReady,
    error: searchError,
    results,
    progress,
    backend,
    loadModel,
    searchByImage,
    reset: resetSearch,
  } = useImageSearch({
    maxResults: 12,
    minSimilarity: 0.25,
    hybridMode: true, // Utiliser le serveur pour la recherche
    useWebGL: true,
  })

  // ─── Local State ───────────────────────────────────────────────────────────
  const [dragActive, setDragActive] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showTechInfo, setShowTechInfo] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Combiner les erreurs
  const error = localError || searchError

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Notifier les résultats trouvés
  useEffect(() => {
    if (results.length > 0 && onResultsFound) {
      onResultsFound(results)
    }
  }, [results, onResultsFound])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setLocalError(null)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null)
    const files = e.target.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }, [])

  const processFile = useCallback((file: File) => {
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setLocalError('Veuillez sélectionner une image (JPG, PNG, WebP)')
      return
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('L\'image ne doit pas dépasser 5 Mo')
      return
    }

    setSelectedFile(file)
    
    // Créer un aperçu
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleSearch = useCallback(async () => {
    if (!selectedFile) return

    setLocalError(null)
    const searchResults = await searchByImage(selectedFile)
    
    if (searchResults.length === 0 && !searchError) {
      setLocalError('Aucun produit similaire trouvé. Essayez avec une autre image.')
    }
  }, [selectedFile, searchByImage, searchError])

  const handleReset = useCallback(() => {
    setSelectedImage(null)
    setSelectedFile(null)
    setLocalError(null)
    resetSearch()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [resetSearch])

  const handleClose = useCallback(() => {
    handleReset()
    onClose()
  }, [handleReset, onClose])

  const handleProductClick = useCallback((productId: string) => {
    if (onProductSelect) {
      onProductSelect(productId)
    }
  }, [onProductSelect])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  {/* Badge TensorFlow */}
                  <div className="absolute -bottom-1 -right-1 px-1 py-0.5 bg-emerald-500 rounded text-[8px] font-bold text-white flex items-center gap-0.5">
                    <Cpu className="h-2 w-2" />
                    AI
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Recherche par image
                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold rounded">
                      TensorFlow.js
                    </span>
                  </h2>
                  <p className="text-sm text-gray-500">
                    Intelligence artificielle pour trouver des produits similaires
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Bouton info technique */}
                <button
                  type="button"
                  onClick={() => setShowTechInfo(!showTechInfo)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    showTechInfo 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  )}
                  title="Informations techniques"
                >
                  <Cpu className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Tech Info Panel */}
            <AnimatePresence>
              {showTechInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-gray-100"
                >
                  <div className="px-6 py-3 bg-gray-50 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Backend:</span>
                      <span className={clsx(
                        'px-1.5 py-0.5 rounded font-medium',
                        backend === 'webgl' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {backend || 'Initialisation...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Modèle:</span>
                      <span className={clsx(
                        'px-1.5 py-0.5 rounded font-medium',
                        isModelReady ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        MobileNet V2 {isModelReady ? '✓' : modelLoading ? '...' : '○'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Architecture:</span>
                      <span className="text-gray-600">1280-dim embeddings + Cosine Similarity</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Progress bar pendant le chargement du modèle */}
              {modelLoading && progress < 100 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement du modèle IA...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Zone de drop / sélection d'image */}
              {!selectedImage ? (
                <div
                  className={clsx(
                    'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all',
                    dragActive
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="flex flex-col items-center gap-4">
                    <div className={clsx(
                      'p-4 rounded-full transition-colors',
                      dragActive ? 'bg-indigo-100' : 'bg-gray-100'
                    )}>
                      <Upload className={clsx(
                        'h-8 w-8',
                        dragActive ? 'text-indigo-600' : 'text-gray-400'
                      )} />
                    </div>
                    
                    <div>
                      <p className="text-base font-semibold text-gray-700 mb-1">
                        Glissez une image ici
                      </p>
                      <p className="text-sm text-gray-500">
                        ou <span className="text-indigo-600 font-medium">cliquez pour parcourir</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ImageIcon className="h-4 w-4" />
                      <span>JPG, PNG, WebP • Max 5 Mo</span>
                    </div>

                    {/* Features */}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                        <Zap className="h-3 w-3" />
                        Analyse IA en temps réel
                      </span>
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                        <Cpu className="h-3 w-3" />
                        Traitement local
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Aperçu de l'image sélectionnée */
                <div className="space-y-4">
                  <div className="relative aspect-video max-h-[250px] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={selectedImage}
                      alt="Image à rechercher"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleReset}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Bouton de recherche */}
                  {results.length === 0 && (
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Analyse en cours avec TensorFlow.js...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Rechercher des produits similaires
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Erreur */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Résultats */}
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <h3 className="font-semibold text-gray-900">
                        {results.length} produit{results.length > 1 ? 's' : ''} similaire{results.length > 1 ? 's' : ''}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Nouvelle recherche
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2">
                    {results.map((result, index) => (
                      <motion.a
                        key={result.id}
                        href={`/produits/${result.id}`}
                        onClick={(e) => {
                          if (onProductSelect) {
                            e.preventDefault()
                            handleProductClick(result.id)
                          }
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="group bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl p-3 transition-all"
                      >
                        <div className="relative aspect-square mb-2 rounded-lg overflow-hidden bg-white">
                          {result.image ? (
                            <img
                              src={result.image}
                              alt={result.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                          {/* Badge similarité avec couleur dynamique */}
                          <div className={clsx(
                            'absolute top-1 right-1 px-1.5 py-0.5 text-white text-[10px] font-bold rounded',
                            result.similarity >= 80 ? 'bg-emerald-500' :
                            result.similarity >= 60 ? 'bg-blue-500' :
                            result.similarity >= 40 ? 'bg-indigo-500' :
                            'bg-gray-500'
                          )}>
                            {result.similarity}%
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-indigo-700">
                          {result.name}
                        </p>
                        {result.priceAmount && (
                          <p className="text-xs font-bold text-indigo-600 mt-1">
                            {result.priceAmount.toLocaleString('fr-FR')} {result.currency}
                          </p>
                        )}
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  Propulsé par
                </span>
                <span className="font-semibold text-indigo-600">TensorFlow.js</span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  MobileNet V2
                </span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Export: Bouton pour déclencher la recherche
// ─────────────────────────────────────────────────────────────────────────────

export function TensorFlowImageSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 hover:from-blue-100 hover:via-indigo-100 hover:to-purple-100 border border-indigo-200 rounded-xl text-indigo-700 text-sm font-medium transition-all group overflow-hidden"
      title="Rechercher par image (TensorFlow.js)"
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      
      <Camera className="h-4 w-4 group-hover:scale-110 transition-transform relative z-10" />
      <span className="hidden sm:inline relative z-10">Recherche visuelle</span>
      
      {/* Badge AI */}
      <span className="hidden sm:flex items-center gap-0.5 px-1 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded relative z-10">
        <Cpu className="h-2.5 w-2.5" />
        AI
      </span>
    </button>
  )
}
