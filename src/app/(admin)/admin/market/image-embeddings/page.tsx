'use client'

/**
 * Admin — Recherche par image (gestion des embeddings + test live).
 *
 * Deux panneaux :
 *  1. Couverture du catalogue + bouton "Indexer un lot" (backfill batch).
 *  2. Test live : drop d'une image → appelle /api/catalog/search-by-image
 *     pour visualiser ce que verrait un utilisateur final.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Upload,
  X,
  ImageIcon,
  Search,
  Sparkles,
  PlayCircle,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Coverage {
  totalIndexable: number
  indexed: number
  missing: number
  percent: number
}

interface BackfillResponse {
  success: boolean
  requested: number
  processed: number
  failed: number
  errors: Array<{ id: string; name: string; error: string }>
  coverage: Coverage
}

interface SearchResult {
  id: string
  name: string
  image: string | null
  category: string | null
  priceAmount: number | null
  currency: string
  similarity: number
}

interface SearchMeta {
  totalAnalyzed?: number
  totalProducts?: number
  embeddingsCoverage?: number
  backfilledThisRequest?: number
  threshold?: number
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminImageEmbeddingsPage() {
  // Couverture
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [coverageError, setCoverageError] = useState<string | null>(null)

  // Backfill
  const [batchLimit, setBatchLimit] = useState<number>(50)
  const [force, setForce] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<BackfillResponse | null>(null)
  const [autoRun, setAutoRun] = useState(false)

  // Test live
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── CSRF helper ──────────────────────────────────────────────────────────
  const fetchCsrf = useCallback(async (): Promise<string | null> => {
    try {
      const r = await fetch('/api/csrf', { credentials: 'include', cache: 'no-store' })
      if (!r.ok) return null
      const j = await r.json()
      return j?.csrfToken || null
    } catch {
      return null
    }
  }, [])

  // ─── Load coverage ────────────────────────────────────────────────────────
  const loadCoverage = useCallback(async () => {
    setCoverageLoading(true)
    setCoverageError(null)
    try {
      const r = await fetch('/api/admin/catalog/image-embeddings/backfill', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j?.error || `HTTP ${r.status}`)
      }
      const j = await r.json()
      setCoverage(j.coverage as Coverage)
    } catch (err: any) {
      setCoverageError(err?.message || 'Erreur de chargement')
    } finally {
      setCoverageLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCoverage()
  }, [loadCoverage])

  // ─── Backfill ─────────────────────────────────────────────────────────────
  const runBackfill = useCallback(async (): Promise<BackfillResponse | null> => {
    setRunning(true)
    try {
      const csrf = await fetchCsrf()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (csrf) headers['X-CSRF-Token'] = csrf
      const url = `/api/admin/catalog/image-embeddings/backfill?limit=${batchLimit}${force ? '&force=1' : ''}`
      const r = await fetch(url, { method: 'POST', credentials: 'include', headers })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`)
      setLastRun(j as BackfillResponse)
      setCoverage(j.coverage)
      return j as BackfillResponse
    } catch (err: any) {
      setLastRun({
        success: false,
        requested: 0,
        processed: 0,
        failed: 0,
        errors: [{ id: '-', name: 'erreur', error: err?.message || 'inconnu' }],
        coverage: coverage || { totalIndexable: 0, indexed: 0, missing: 0, percent: 0 },
      })
      return null
    } finally {
      setRunning(false)
    }
  }, [batchLimit, force, fetchCsrf, coverage])

  // Auto-run : enchaîne les batchs jusqu'à 100% (utile pour amorcer rapidement)
  useEffect(() => {
    if (!autoRun || running) return
    if (!coverage || coverage.missing === 0) {
      setAutoRun(false)
      return
    }
    const t = setTimeout(() => {
      runBackfill()
    }, 800)
    return () => clearTimeout(t)
  }, [autoRun, running, coverage, runBackfill])

  // ─── Test live recherche ──────────────────────────────────────────────────
  const onPickFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setSearchError("Le fichier doit être une image (JPG, PNG, WebP).")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setSearchError("L'image ne doit pas dépasser 5 Mo.")
      return
    }
    setSearchError(null)
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const runSearch = useCallback(async () => {
    if (!file) return
    setSearching(true)
    setSearchError(null)
    setSearchResults(null)
    setSearchMeta(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      if (searchText.trim()) fd.append('searchText', searchText.trim())

      const csrf = await fetchCsrf()
      const headers: Record<string, string> = {}
      if (csrf) headers['X-CSRF-Token'] = csrf

      const r = await fetch('/api/catalog/search-by-image', {
        method: 'POST',
        body: fd,
        credentials: 'include',
        headers,
      })
      if (r.status === 429) throw new Error('Rate limit (8 / minute). Attendez un peu.')
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`)
      setSearchResults(j.results || [])
      setSearchMeta(j.meta || null)
      // Recharge la couverture car la requête a pu déclencher du backfill on-demand
      loadCoverage()
    } catch (err: any) {
      setSearchError(err?.message || 'Erreur')
    } finally {
      setSearching(false)
    }
  }, [file, searchText, fetchCsrf, loadCoverage])

  const resetSearch = useCallback(() => {
    setFile(null)
    setPreview(null)
    setSearchText('')
    setSearchResults(null)
    setSearchMeta(null)
    setSearchError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ─── UI ───────────────────────────────────────────────────────────────────

  const percent = coverage?.percent ?? 0
  const percentColor =
    percent < 30
      ? 'from-red-500 to-orange-500'
      : percent < 70
        ? 'from-amber-500 to-yellow-500'
        : 'from-emerald-500 to-green-600'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recherche par image</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Indexation des produits via perceptual hash (dHash + histogramme couleur). Plus la couverture
          est élevée, meilleurs sont les résultats côté utilisateur.
        </p>
      </div>

      {/* Couverture ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Couverture du catalogue</h2>
          </div>
          <button
            type="button"
            onClick={loadCoverage}
            disabled={coverageLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${coverageLoading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>

        {coverageError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{coverageError}</span>
          </div>
        )}

        {coverage ? (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {coverage.indexed.toLocaleString('fr-FR')}
                <span className="ml-1 text-base font-medium text-gray-500">
                  / {coverage.totalIndexable.toLocaleString('fr-FR')}
                </span>
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {percent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <div
                className={`h-full bg-gradient-to-r ${percentColor} transition-all`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {coverage.missing > 0
                ? `${coverage.missing.toLocaleString('fr-FR')} produit${coverage.missing > 1 ? 's' : ''} en attente d'indexation.`
                : 'Tous les produits avec image sont indexés.'}
            </p>
          </>
        ) : (
          <div className="text-sm text-gray-500">Chargement…</div>
        )}
      </section>

      {/* Backfill ────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Indexer le catalogue</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
              Taille du lot
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={batchLimit}
              onChange={(e) => setBatchLimit(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-gray-400">1 à 200 par appel (timeout 60s)</p>
          </div>
          <div>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                Recalcul forcé (réindexe les produits déjà indexés)
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                disabled={running}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                Auto-enchaîner jusqu'à 100%
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runBackfill}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-violet-700 disabled:opacity-60"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Indexation en cours…
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Lancer un lot
              </>
            )}
          </button>
          {autoRun && (
            <span className="text-xs text-violet-700 dark:text-violet-300 font-medium">
              Mode auto activé · prochain lot dans 0,8s après chaque succès
            </span>
          )}
        </div>

        {lastRun && (
          <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 mb-2">
              {lastRun.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-semibold">
                Dernier lot — demandé {lastRun.requested}, traité {lastRun.processed}, échoués{' '}
                {lastRun.failed}
              </span>
            </div>
            {lastRun.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-600">
                  Voir {lastRun.errors.length} erreur{lastRun.errors.length > 1 ? 's' : ''}
                </summary>
                <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                  {lastRun.errors.map((e, i) => (
                    <li key={i} className="font-mono">
                      <strong>{e.name}</strong> — {e.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Test live ──────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Test live</h2>
          <span className="text-xs text-gray-400">
            Simule exactement ce que voit un utilisateur final
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Colonne gauche : upload + paramètres */}
          <div>
            {!preview ? (
              <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-emerald-900/10">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onPickFile(f)
                  }}
                />
                <Upload className="h-7 w-7 text-gray-400" />
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Cliquez pour sélectionner une image
                </div>
                <div className="text-xs text-gray-400">JPG / PNG / WebP · max 5 Mo</div>
              </label>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800">
                  <img src={preview} alt="aperçu" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
                  >
                    <X className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Texte optionnel (ex: caméra dome Hikvision)"
                  maxLength={200}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={searching}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recherche…
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Lancer la recherche
                    </>
                  )}
                </button>
              </div>
            )}
            {searchError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Colonne droite : résultats */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Résultats</h3>
            {!searchResults && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800/40">
                <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                Aucune recherche lancée pour le moment.
              </div>
            )}
            {searchResults && searchResults.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                Aucun produit similaire trouvé. La couverture est de{' '}
                <strong>{searchMeta?.embeddingsCoverage ?? 0}%</strong>. Lancez plus de batchs pour
                améliorer les résultats.
              </div>
            )}
            {searchResults && searchResults.length > 0 && (
              <>
                {searchMeta && (
                  <div className="mb-2 text-[11px] text-gray-500">
                    {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} ·{' '}
                    {searchMeta.totalAnalyzed ?? '?'} produits comparés · couverture{' '}
                    {searchMeta.embeddingsCoverage ?? 0}%
                    {searchMeta.backfilledThisRequest
                      ? ` · +${searchMeta.backfilledThisRequest} indexés à la volée`
                      : ''}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {searchResults.map((r) => (
                    <a
                      key={r.id}
                      href={`/produits/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg border border-gray-200 bg-white p-2 hover:border-emerald-400 hover:shadow dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="relative aspect-square overflow-hidden rounded bg-gray-50">
                        {r.image ? (
                          <img
                            src={r.image}
                            alt={r.name}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                        <span className="absolute top-1 right-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {r.similarity}%
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[11px] font-medium text-gray-800 dark:text-gray-200">
                        {r.name}
                      </p>
                      {r.priceAmount ? (
                        <p className="text-[11px] font-bold text-emerald-600">
                          {r.priceAmount.toLocaleString('fr-FR')} {r.currency}
                        </p>
                      ) : null}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
