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
  ArrowRight,
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

interface SearchMeta {
  totalAnalyzed?: number
  totalProducts?: number
  embeddingsCoverage?: number
  threshold?: number
}

interface ImageSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onResultsFound: (results: ImageSearchResult[]) => void
  /** Quand cliqué, ferme la modale et ouvre la modale "Trouvez-moi ce produit" */
  onRequestSourcing?: (context: { file: File | null; description: string }) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ImageSearchModal({
  isOpen,
  onClose,
  onResultsFound,
  onRequestSourcing,
}: ImageSearchModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ImageSearchResult[] | null>(null)
  const [meta, setMeta] = useState<SearchMeta | null>(null)

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
      // Créer le FormData avec l'image + texte optionnel
      const formData = new FormData()
      formData.append('image', selectedFile)
      if (searchText.trim()) formData.append('searchText', searchText.trim())

      // Récupérer un token CSRF (le middleware l'exige en production pour
      // les POST non authentifiés — voir lib/csrf-protection.ts)
      const fetchCsrf = async (): Promise<string | null> => {
        try {
          const r = await fetch('/api/csrf', { credentials: 'include', cache: 'no-store' })
          if (!r.ok) return null
          const j = await r.json()
          return j?.csrfToken || null
        } catch {
          return null
        }
      }
      let csrfToken = await fetchCsrf()

      const doSearch = async (csrf: string | null): Promise<Response> => {
        const headers: Record<string, string> = {}
        if (csrf) headers['X-CSRF-Token'] = csrf
        return fetch('/api/catalog/search-by-image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers,
        })
      }

      let response = await doSearch(csrfToken)

      // Retry une fois si CSRF expiré
      if (response.status === 403) {
        const peek = await response.clone().json().catch(() => ({} as any))
        if (typeof peek?.error === 'string' && /CSRF/i.test(peek.error)) {
          const fresh = await fetchCsrf()
          if (fresh) response = await doSearch(fresh)
        }
      }
      if (response.status === 429) {
        throw new Error('Trop de recherches successives. Réessayez dans une minute.')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recherche')
      }

      if (data.success && Array.isArray(data.results)) {
        setResults(data.results)
        setMeta(data.meta || null)
        // Passer les résultats au parent uniquement si on a réellement matched
        if (data.results.length >= 4) {
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
  }, [selectedFile, searchText, onResultsFound])

  const resetSearch = useCallback(() => {
    setSelectedImage(null)
    setSelectedFile(null)
    setSearchText('')
    setResults(null)
    setMeta(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleSourcingHandoff = useCallback(() => {
    if (!onRequestSourcing) return
    onRequestSourcing({ file: selectedFile, description: searchText.trim() })
    onClose()
  }, [onRequestSourcing, selectedFile, searchText, onClose])

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
            className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Camera className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recherche par image</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Trouvez des produits similaires dans notre catalogue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                      : 'border-gray-300 dark:border-gray-700 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
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
                      dragActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'
                    )}>
                      <Upload className={clsx(
                        'h-8 w-8',
                        dragActive ? 'text-emerald-600' : 'text-gray-400'
                      )} />
                    </div>
                    
                    <div>
                      <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
                        Glissez une image ici
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ou <span className="text-emerald-600 font-medium">cliquez pour parcourir</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <ImageIcon className="h-4 w-4" />
                      <span>JPG, PNG, WebP • Max 5 Mo</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Aperçu de l'image sélectionnée */
                <div className="space-y-4">
                  <div className="relative aspect-video max-h-[300px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <img
                      src={selectedImage}
                      alt="Image à rechercher"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={resetSearch}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900 rounded-full shadow-md transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-600 dark:text-gray-200" />
                    </button>
                  </div>

                  {/* Texte optionnel pour préciser la recherche */}
                  {!results && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Précisez si besoin (marque, modèle, usage… optionnel)
                      </label>
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="ex: caméra dome extérieur Hikvision"
                        maxLength={200}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

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
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {results.length} résultat{results.length > 1 ? 's' : ''} dans notre catalogue
                      </h3>
                    </div>
                    {meta?.totalProducts ? (
                      <span className="text-[10px] text-gray-400">
                        sur {meta.totalProducts} produits indexés
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto pr-2">
                    {results.map((result) => (
                      <a
                        key={result.id}
                        href={`/produits/${result.id}`}
                        className="group bg-gray-50 dark:bg-gray-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-600/40 rounded-xl p-3 transition-all"
                      >
                        <div className="relative aspect-square mb-2 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                          {result.image ? (
                            <img
                              src={result.image}
                              alt={result.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                          {/* Badge similarité */}
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded">
                            {result.similarity}%
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-emerald-700">
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

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={resetSearch}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      <Search className="h-4 w-4" />
                      Nouvelle recherche
                    </button>
                    {onRequestSourcing && (
                      <button
                        type="button"
                        onClick={handleSourcingHandoff}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold shadow"
                      >
                        Pas trouvé ? On le trouve pour vous
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Aucun résultat — handoff sourcing */}
              {results && results.length === 0 && (
                <div className="mt-4 text-center p-6 bg-gradient-to-br from-violet-50 to-emerald-50 dark:from-violet-900/10 dark:to-emerald-900/10 border border-violet-100 dark:border-violet-900/30 rounded-xl">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700 dark:text-gray-200 font-medium">
                    Aucun produit similaire dans notre catalogue
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Notre équipe peut le sourcer pour vous (réponse sous 24h, sans engagement).
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                    {onRequestSourcing && (
                      <button
                        type="button"
                        onClick={handleSourcingHandoff}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-bold shadow"
                      >
                        Trouvez-moi ce produit
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resetSearch}
                      className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      Essayer une autre image
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />
                Comparaison par empreinte visuelle (perceptual hash) · résultats best-effort
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
