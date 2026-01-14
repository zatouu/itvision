'use client'

import { useState, useRef, useCallback } from 'react'
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
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ImageSearchResult {
  id: string
  name: string
  image: string | null
  category: string | null
  priceAmount: number | null
  currency: string
  similarity: number // Score de similarité 0-100
}

interface ImageSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onResultsFound: (results: ImageSearchResult[]) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ImageSearchModal({
  isOpen,
  onClose,
  onResultsFound,
}: ImageSearchModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ImageSearchResult[] | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setError(null)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }, [])

  const processFile = useCallback((file: File) => {
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPG, PNG, WebP)')
      return
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5 Mo')
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

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      // Créer le FormData avec l'image
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await fetch('/api/catalog/search-by-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recherche')
      }

      if (data.success && data.results) {
        setResults(data.results)
        // Passer les résultats au parent
        if (data.results.length > 0) {
          onResultsFound(data.results)
        }
      } else {
        setError('Aucun produit similaire trouvé')
      }
    } catch (err) {
      console.error('Image search error:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche par image')
    } finally {
      setLoading(false)
    }
  }, [selectedFile, onResultsFound])

  const resetSearch = useCallback(() => {
    setSelectedImage(null)
    setSelectedFile(null)
    setResults(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleClose = useCallback(() => {
    resetSearch()
    onClose()
  }, [resetSearch, onClose])

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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Camera className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recherche par image</h2>
                  <p className="text-sm text-gray-500">Trouvez des produits similaires dans notre catalogue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Zone de drop / sélection d'image */}
              {!selectedImage ? (
                <div
                  className={clsx(
                    'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all',
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
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
                      dragActive ? 'bg-emerald-100' : 'bg-gray-100'
                    )}>
                      <Upload className={clsx(
                        'h-8 w-8',
                        dragActive ? 'text-emerald-600' : 'text-gray-400'
                      )} />
                    </div>
                    
                    <div>
                      <p className="text-base font-semibold text-gray-700 mb-1">
                        Glissez une image ici
                      </p>
                      <p className="text-sm text-gray-500">
                        ou <span className="text-emerald-600 font-medium">cliquez pour parcourir</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ImageIcon className="h-4 w-4" />
                      <span>JPG, PNG, WebP • Max 5 Mo</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Aperçu de l'image sélectionnée */
                <div className="space-y-4">
                  <div className="relative aspect-video max-h-[300px] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={selectedImage}
                      alt="Image à rechercher"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={resetSearch}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Bouton de recherche */}
                  {!results && (
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Analyse en cours...
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
                <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Résultats */}
              {results && results.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-semibold text-gray-900">
                      {results.length} produit{results.length > 1 ? 's' : ''} similaire{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto pr-2">
                    {results.map((result) => (
                      <a
                        key={result.id}
                        href={`/produits/${result.id}`}
                        className="group bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl p-3 transition-all"
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
                          {/* Badge similarité */}
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded">
                            {result.similarity}%
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-emerald-700">
                          {result.name}
                        </p>
                        {result.priceAmount && (
                          <p className="text-xs font-bold text-emerald-600 mt-1">
                            {result.priceAmount.toLocaleString('fr-FR')} {result.currency}
                          </p>
                        )}
                      </a>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={resetSearch}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    <Search className="h-4 w-4" />
                    Nouvelle recherche
                  </button>
                </div>
              )}

              {/* Aucun résultat */}
              {results && results.length === 0 && (
                <div className="mt-4 text-center p-6 bg-gray-50 rounded-xl">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Aucun produit similaire trouvé</p>
                  <p className="text-sm text-gray-500 mt-1">Essayez avec une autre image</p>
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    Nouvelle recherche
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />
                Recherche intelligente basée sur la reconnaissance d'image
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bouton déclencheur pour la barre de recherche
// ─────────────────────────────────────────────────────────────────────────────

export function ImageSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium transition-all group"
      title="Rechercher par image"
    >
      <Camera className="h-4 w-4 group-hover:scale-110 transition-transform" />
      <span className="hidden sm:inline">Recherche visuelle</span>
    </button>
  )
}
