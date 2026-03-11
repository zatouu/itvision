'use client'

import { useState } from 'react'
import DialogError from '@/components/DialogError'
import { Download, Search, Link as LinkIcon, Loader2, CheckCircle, X, ExternalLink, AlertCircle, Sparkles, ChevronRight } from 'lucide-react'
import ProtectedPage from '@/components/ProtectedPage'
import ErrorBoundary from '@/components/ErrorBoundary'

interface ImportItem {
  productId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  baseCost?: number
  price?: number
  currency: string
  weightKg?: number
  features: string[]
  category: string
  tagline: string
  availabilityNote: string
  shopName?: string
  orders?: number
  totalRated?: number
}

interface BulkImportResult {
  url: string
  ok: boolean
  action?: 'created' | 'updated' | 'preview'
  productId?: string
  error?: string
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export default function ImportProduitsPage() {
  return (
    <ProtectedPage requiredRole={['ADMIN', 'PRODUCT_MANAGER']}>
      <ErrorBoundary>
        <ImportProduitsContent />
      </ErrorBoundary>
    </ProtectedPage>
  )
}

function ImportProduitsContent() {
  const [activeTab, setActiveTab] = useState<'search' | 'url' | 'bulk' | 'smart'>('search')
  const [keyword, setKeyword] = useState('')
  const [limit, setLimit] = useState(6)
  const [apifyRunId, setApifyRunId] = useState('')
  const [searchSource, setSearchSource] = useState<'auto' | 'apify' | 'rapidapi'>('auto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [results, setResults] = useState<ImportItem[]>([])
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set())
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [bulkUrls, setBulkUrls] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkImportResult[] | null>(null)
  const [bulkDryRun, setBulkDryRun] = useState(false)

  // Smart Import state
  const [smartJson, setSmartJson] = useState('')
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartResults, setSmartResults] = useState<any[] | null>(null)
  const [smartError, setSmartError] = useState<string | null>(null)
  const [smartOpts, setSmartOpts] = useState({ exchangeRate: 85, serviceFeeRate: 10, b2bDiscountPercent: 15, reformatDescriptions: false, autoPublish: false })

  const handleSmartImport = async () => {
    setSmartError(null)
    setSmartResults(null)
    let parsed: any[]
    try {
      const raw = JSON.parse(smartJson.trim())
      parsed = Array.isArray(raw) ? raw : [raw]
    } catch {
      setSmartError('JSON invalide — collez un tableau [{...}, ...] ou un objet {...}')
      return
    }
    if (parsed.length === 0) { setSmartError('Aucun produit détecté'); return }
    setSmartLoading(true)
    try {
      const res = await fetch('/api/admin/products/smart-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ products: parsed, options: smartOpts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setSmartResults(data.results)
      setFeedback(`${data.imported} produit(s) importé(s) sur ${data.total}`)
    } catch (err) {
      setSmartError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSmartLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('fr-FR')} ${currency}`
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) {
      setDialogError('Veuillez entrer un mot-clé')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setFeedback(null)

    try {
      const sourceParam = searchSource === 'auto' ? '' : `&source=${searchSource}`
      const response = await fetch(`/api/products/import?keyword=${encodeURIComponent(keyword)}&limit=${limit}${sourceParam}`, {
        credentials: 'include'
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la recherche')
      }

      setResults(data.items || [])
      if (data.items && data.items.length === 0) {
        setFeedback('Aucun résultat trouvé. Essayez un autre mot-clé.')
      }
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Erreur lors de la recherche AliExpress'))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadFromApifyRun = async () => {
    if (!apifyRunId.trim()) {
      setDialogError('Veuillez coller un runId Apify (ou une URL de run)')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setFeedback(null)

    try {
      const response = await fetch(
        `/api/apify/run?runId=${encodeURIComponent(apifyRunId.trim())}&limit=${limit}`,
        { credentials: 'include' }
      )

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement Apify')
      }

      setResults(data.items || [])
      if (!data.items || data.items.length === 0) {
        setFeedback('Run Apify chargé, mais aucun item exploitable trouvé.')
      }
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Erreur lors du chargement Apify'))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (item: ImportItem) => {
    const itemId = item.productId || item.productUrl
    if (importingIds.has(itemId)) return

    setImportingIds(prev => new Set(prev).add(itemId))
    setError(null)
    setDialogError(null)
    setFeedback(null)

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ item })
      })

      const data = await response.json()

      if (!data.success) {
        setDialogError(data.error || 'Erreur lors de l\'import')
        return
      }

      setImportedIds(prev => new Set(prev).add(itemId))
      setFeedback(data.action === 'updated' ? 'Produit mis à jour avec succès' : 'Produit importé avec succès')
      setTimeout(() => setFeedback(null), 3000)
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Erreur lors de l\'import'))
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const [preview, setPreview] = useState<ImportItem | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const handleImportByUrl = async () => {
    setPreview(null)
    setPreviewError(null)
    if (!urlInput.trim()) {
      setDialogError('Veuillez entrer une URL AliExpress')
      return
    }
    setPreviewLoading(true)
    try {
      const response = await fetch(`/api/products/import?url=${encodeURIComponent(urlInput.trim())}`, {
        method: 'GET',
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success && data.item) {
        setPreview(data.item)
      } else {
        setDialogError(data.error || 'Impossible de prévisualiser le produit')
      }
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Erreur lors de la prévisualisation'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleImportAliExpressPreview = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    setDialogError(null)
    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ item: preview })
      })
      const data = await response.json()
      if (data.success) {
        setFeedback('Produit importé avec succès !')
        setImportedIds(prev => new Set(prev).add(preview.productUrl))
        setPreview(null)
        setUrlInput('')
      } else {
        setDialogError(data.error || 'Erreur lors de l\'import')
      }
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Erreur lors de l\'import'))
    } finally {
      setLoading(false)
    }
  }

  const handleBulkImport = async () => {
    if (!bulkUrls.trim()) {
      setDialogError('Veuillez entrer au moins une URL')
      return
    }

    const urls = bulkUrls
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.includes('aliexpress.com') || line.includes('1688.com')))

    if (urls.length === 0) {
      setDialogError('Aucune URL valide trouvée. Les URLs doivent être des liens AliExpress ou 1688.')
      return
    }

    setBulkLoading(true)
    setDialogError(null)
    setFeedback(null)
    setBulkResults(null)

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urls, dryRun: bulkDryRun })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de l\'import en masse')
      }

      const res: BulkImportResult[] = Array.isArray(data.results) ? data.results : []
      setBulkResults(res)

      const summary = data.summary
      if (summary && typeof summary === 'object') {
        setFeedback(
          `${summary.created ?? 0} créé(s), ${summary.updated ?? 0} mis à jour, ${summary.failed ?? 0} échec(s) (total: ${summary.total ?? res.length})`
        )
      } else {
        const okCount = res.filter(r => r.ok).length
        setFeedback(`${okCount} succès / ${res.length} URLs traitées`)
      }
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Erreur lors de l\'import en masse'))
    } finally {
      setBulkLoading(false)
    }
  }

  const handleImportAll = async () => {
    if (results.length === 0) return

    setLoading(true)
    setError(null)
    setDialogError(null)
    setFeedback(null)

    try {
      const itemsToImport = results.filter(item => {
        const itemId = item.productId || item.productUrl
        return !importedIds.has(itemId)
      })

      if (itemsToImport.length === 0) {
        setFeedback('Tous les produits sont déjà importés.')
        return
      }

      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: itemsToImport })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de l\'import en masse')
      }

      const res = Array.isArray(data.results) ? (data.results as Array<{ productUrl: string; ok: boolean }>) : []
      const okCount = res.filter(r => r.ok).length
      const koCount = res.length - okCount

      setImportedIds(prev => {
        const next = new Set(prev)
        for (const item of itemsToImport) {
          const itemId = item.productId || item.productUrl
          next.add(itemId)
        }
        return next
      })

      setFeedback(`${okCount} produit(s) importé(s) avec succès${koCount > 0 ? `, ${koCount} échec(s)` : ''}`)
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Erreur lors de l\'import en masse'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <DialogError
        open={!!dialogError}
        message={dialogError || ''}
        onClose={() => setDialogError(null)}
      />
      <div className="mb-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import de produits</h1>
          <p className="text-gray-600 mb-3">
            Importez facilement des produits depuis AliExpress ou Alibaba pour enrichir votre catalogue
          </p>
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 mb-4">
            <p className="text-sm text-violet-800">
              Configurez <code className="bg-violet-100 px-1 rounded">APIFY_API_KEY</code> pour utiliser Apify (recommandé). Ou utilisez <strong>Smart Import</strong> pour le pipeline filtrage images + description IA.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex flex-wrap gap-x-6">
            {([
              { id: 'search', label: 'Mot-clé', icon: Search },
              { id: 'url', label: 'Par URL', icon: LinkIcon },
              { id: 'bulk', label: 'En masse', icon: Download },
              { id: 'smart', label: 'Smart Import IA', icon: Sparkles },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === id
                    ? id === 'smart' ? 'border-violet-500 text-violet-600' : 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === 'smart' && <span className="ml-1 text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {feedback && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-800">{feedback}</p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Rechercher sur AliExpress</h2>
              <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot-clé de recherche
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    placeholder="Ex: hikvision camera, alarm system, access control..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de résultats
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    value={limit}
                    onChange={e => setLimit(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    value={searchSource}
                    onChange={e => setSearchSource(e.target.value as 'auto' | 'apify' | 'rapidapi')}
                  >
                    <option value="auto">Auto (selon .env)</option>
                    <option value="apify">Forcer Apify</option>
                    <option value="rapidapi">Forcer RapidAPI</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 text-sm font-semibold text-white hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Rechercher
                </button>
              </form>
            </div>

            {/* Apify run loader */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Charger depuis un run Apify</h2>
              <p className="text-sm text-gray-600 mb-4">
                Collez un <strong>runId</strong> ou une <strong>URL</strong> de run Apify. Le token Apify doit être configuré côté serveur via <code className="bg-gray-100 px-1 rounded">APIFY_API_KEY</code> (ou <code className="bg-gray-100 px-1 rounded">APIFY_TOKEN</code>).
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Run Apify</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    placeholder="Ex: saZDhyZ1GgVmUKsw9 (ou URL complète)"
                    value={apifyRunId}
                    onChange={e => setApifyRunId(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLoadFromApifyRun}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Charger
                </button>
              </div>
            </div>

            {/* Results */}
            {loading && results.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
                <p className="text-gray-600">Recherche en cours...</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
                  </h3>
                  {results.length > 1 && (
                    <button
                      onClick={handleImportAll}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-semibold text-white hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Tout importer
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {results.map(item => {
                    const itemId = item.productId || item.productUrl
                    const isImporting = importingIds.has(itemId)
                    const isImported = importedIds.has(itemId)

                    return (
                      <div
                        key={itemId}
                        className={`bg-white rounded-xl border-2 p-4 shadow-sm transition ${
                          isImported ? 'border-green-500 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex gap-3 mb-3">
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
                                Pas d'image
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{item.name}</h4>
                            <p className="text-xs text-gray-500 mb-2">{item.shopName || 'Fournisseur AliExpress'}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                              {typeof item.baseCost === 'number' && (
                                <span>Coût: {formatCurrency(item.baseCost, item.currency)}</span>
                              )}
                              {typeof item.price === 'number' && (
                                <span className="font-semibold text-green-600">
                                  Prix: {formatCurrency(item.price, item.currency)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {item.features.length > 0 && (
                          <ul className="mb-3 space-y-1 text-xs text-gray-500">
                            {item.features.slice(0, 3).map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-green-600">•</span>
                                <span className="line-clamp-1">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleImport(item)}
                            disabled={isImporting || isImported}
                            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              isImported
                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 disabled:opacity-50'
                            }`}
                          >
                            {isImporting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Import...
                              </>
                            ) : isImported ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Importé
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3" />
                                Importer
                              </>
                            )}
                          </button>
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Voir
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!loading && results.length === 0 && keyword && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-600">Aucun résultat trouvé. Essayez un autre mot-clé.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'url' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Importer par URL AliExpress</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL du produit AliExpress
                </label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  placeholder="https://www.aliexpress.com/item/..."
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  disabled={previewLoading}
                />
              </div>
              <button
                onClick={handleImportByUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 text-sm font-semibold text-white hover:from-green-600 hover:to-green-700"
                disabled={previewLoading || !urlInput.trim()}
              >
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Prévisualiser
              </button>
              {previewError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 mt-2">
                  <p className="text-sm text-red-800">{previewError}</p>
                </div>
              )}
              {preview && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 mt-4">
                  <div className="flex gap-4 items-center">
                    {preview.image && (
                      <img src={preview.image} alt={preview.name} className="w-24 h-24 object-cover rounded" />
                    )}
                    <div>
                      <h3 className="text-lg font-bold mb-1">{preview.name}</h3>
                      <p className="text-sm text-gray-700 mb-1">{preview.tagline}</p>
                      {typeof preview.price === 'number' && (
                        <p className="text-md font-semibold text-green-700 mb-1">Prix estimé : {formatCurrency(preview.price, preview.currency)}</p>
                      )}
                      <p className="text-xs text-gray-500">{preview.availabilityNote}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleImportAliExpressPreview}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 text-sm font-semibold text-white hover:from-green-600 hover:to-green-700"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Importer ce produit
                  </button>
                </div>
              )}
              {feedback && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 mt-2">
                  <p className="text-sm text-green-800">{feedback}</p>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 mt-2">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import en masse</h2>
            <div className="space-y-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-200"
                  checked={bulkDryRun}
                  onChange={(e) => setBulkDryRun(e.target.checked)}
                  disabled={bulkLoading}
                />
                Prévisualisation uniquement (dry-run) — n’écrit rien en base
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URLs des produits (une par ligne)
                </label>
                <textarea
                  rows={10}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-mono focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  placeholder="https://www.aliexpress.com/item/1234567890.html&#10;https://www.aliexpress.com/item/0987654321.html&#10;..."
                  value={bulkUrls}
                  onChange={e => setBulkUrls(e.target.value)}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Collez une URL par ligne. Les URLs doivent être des liens AliExpress ou 1688.
                </p>
              </div>
              <button
                onClick={handleBulkImport}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 text-sm font-semibold text-white hover:from-green-600 hover:to-green-700"
                disabled={bulkLoading}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {bulkLoading ? 'Import en cours…' : 'Importer tous les produits'}
              </button>
              {bulkResults && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">Résultats</p>
                  <div className="space-y-2">
                    {bulkResults.map((r) => (
                      <div key={r.url} className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 break-all">{r.url}</p>
                          {!r.ok && r.error && <p className="text-xs text-red-700 mt-1">{r.error}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.ok ? (
                            <span className="text-xs font-semibold text-green-700">
                              {r.action === 'created' ? 'Créé' : r.action === 'updated' ? 'Mis à jour' : 'OK'}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-red-700">Échec</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'smart' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-violet-200 p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-violet-100 rounded-xl">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Smart Import IA</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Collez les données brutes depuis l'extension Chrome ou un JSON. Les images polluées sont filtrées automatiquement, les descriptions reformatées en français via IA.</p>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Taux (FCFA/¥)</label>
                  <input type="number" value={smartOpts.exchangeRate} onChange={e => setSmartOpts(p => ({ ...p, exchangeRate: Number(e.target.value) }))} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Frais service (%)</label>
                  <input type="number" value={smartOpts.serviceFeeRate} onChange={e => setSmartOpts(p => ({ ...p, serviceFeeRate: Number(e.target.value) }))} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Remise B2B (%)</label>
                  <input type="number" value={smartOpts.b2bDiscountPercent} onChange={e => setSmartOpts(p => ({ ...p, b2bDiscountPercent: Number(e.target.value) }))} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={smartOpts.reformatDescriptions} onChange={e => setSmartOpts(p => ({ ...p, reformatDescriptions: e.target.checked }))} className="rounded" />
                    Reformater desc. (OpenAI)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={smartOpts.autoPublish} onChange={e => setSmartOpts(p => ({ ...p, autoPublish: e.target.checked }))} className="rounded" />
                    Publier directement
                  </label>
                </div>
              </div>

              {/* JSON Input */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Données JSON produits</label>
                <textarea
                  rows={12}
                  value={smartJson}
                  onChange={e => setSmartJson(e.target.value)}
                  placeholder={`[\n  {\n    "name": "Caméra IP WiFi 4MP",\n    "description": "Description brute du produit...",\n    "images": ["https://...", "https://..."],\n    "price1688": 89,\n    "sourceUrl": "https://detail.1688.com/offer/123.html",\n    "sourcePlatform": "1688"\n  }\n]`}
                  className="w-full font-mono text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none resize-y bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1">Champs supportés : name, description, images[], price1688, price, category, features[], weightKg, sourceUrl, sourcePlatform, variants[]</p>
              </div>

              {smartError && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{smartError}</div>
              )}

              <button
                onClick={handleSmartImport}
                disabled={smartLoading || !smartJson.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 text-white text-sm font-bold hover:from-green-600 hover:to-violet-600 transition shadow disabled:opacity-50"
              >
                {smartLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {smartLoading ? 'Import en cours...' : 'Lancer Smart Import'}
              </button>
            </div>

            {/* Résultats */}
            {smartResults && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Résultats ({smartResults.filter((r: any) => r.success).length}/{smartResults.length})</h3>
                <div className="space-y-2">
                  {smartResults.map((r: any) => (
                    <div key={r.index} className={`flex items-start gap-3 p-3 rounded-xl border ${
                      r.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${ r.success ? 'text-green-800' : 'text-red-800'}`}>{r.name}</p>
                        {r.success ? (
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            {r.pricing && <span>Prix retail : {r.pricing.price.toLocaleString('fr-FR')} FCFA · B2B : {r.pricing.b2bPrice.toLocaleString('fr-FR')} FCFA</span>}
                            {typeof r.imagesOriginal === 'number' && <span>Images : {r.imagesOriginal} brutes → {r.imagesFiltered} filtrées</span>}
                            {r.descriptionReformatted && <span className="text-violet-600 font-medium">✓ Desc. reformatée</span>}
                            {r.productId && (
                              <a href={`/produits/${r.productId}`} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline flex items-center gap-1">
                                Voir <ChevronRight className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-red-600 mt-0.5">{r.error}</p>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${ r.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {r.success ? 'OK' : 'Erreur'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

