'use client'

/**
 * Modale "Trouvez-moi ce produit".
 * Le client soumet une photo, un lien externe et/ou une description.
 * - Si non connecté : téléphone requis (notification SMS sous 24h max).
 * - Si connecté : on utilise son téléphone enregistré (modifiable).
 * Confirmation finale : référence + lien de tracking.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Link as LinkIcon,
  FileText,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  Search,
  Trophy,
  Star,
  Zap,
  Globe
} from 'lucide-react'

type Tab = 'photo' | 'link' | 'text'

interface CurrentUser {
  id?: string
  name?: string
  phone?: string
  email?: string
}

interface SourcingRequestModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: CurrentUser | null
  /** Pré-remplissage venant d'un handoff externe (ex: ImageSearchModal) */
  initialContext?: { file?: File | null; description?: string } | null
}

type CreatedResult = {
  id: string
  reference: string
  publicToken: string
  trackUrl: string
  slaDueAt: string
}

type CatalogMatch = {
  id: string
  name: string
  image: string
  category: string
  price: number
  currency: string
  visualScore: number
  colorScore: number
  finalScore: number
}

const MAX_IMAGE = 8 * 1024 * 1024

export default function SourcingRequestModal({
  isOpen,
  onClose,
  currentUser,
  initialContext,
}: SourcingRequestModalProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('photo')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState<number>(1)
  const [budgetMax, setBudgetMax] = useState<string>('')
  const [deliveryNeededBy, setDeliveryNeededBy] = useState<string>('')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [contactName, setContactName] = useState(currentUser?.name || '')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreatedResult | null>(null)
  const [catalogMatch, setCatalogMatch] = useState<CatalogMatch | null>(null)
  const [needsContact, setNeedsContact] = useState(false)
  type Phase = 'search' | 'match' | 'searching_external' | 'external_results' | 'contact' | 'result'
  const [phase, setPhase] = useState<Phase>('search')
  const [externalResults, setExternalResults] = useState<Array<{
    title: string
    price1688?: number
    image: string
    url: string
    supplier?: string
    minOrder?: number
  }> | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Réinitialiser les champs du compte quand currentUser change
  useEffect(() => {
    if (currentUser?.phone && !phone) setPhone(currentUser.phone)
    if (currentUser?.name && !contactName) setContactName(currentUser.name)
    if (currentUser?.email && !email) setEmail(currentUser.email)
  }, [currentUser, phone, contactName, email])

  // Récupérer un token CSRF dès l'ouverture de la modale
  useEffect(() => {
    if (!isOpen || csrfToken) return
    let cancelled = false
    fetch('/api/csrf', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.csrfToken) setCsrfToken(data.csrfToken)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isOpen, csrfToken])

  // Pré-remplir depuis le handoff (ex: ImageSearchModal → sourcing)
  useEffect(() => {
    if (!isOpen || !initialContext) return
    if (initialContext.file) {
      setTab('photo')
      setFile(initialContext.file)
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target?.result as string)
      reader.readAsDataURL(initialContext.file)
    } else if (initialContext.description) {
      setTab('text')
    }
    if (initialContext.description && !description) {
      setDescription(initialContext.description)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialContext])

  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/csrf', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return null
      const data = await res.json()
      if (data?.csrfToken) {
        setCsrfToken(data.csrfToken)
        return data.csrfToken
      }
    } catch {}
    return null
  }, [])

  const resetForm = useCallback(() => {
    setPhase('search')
    setTab('photo')
    setFile(null)
    setFilePreview(null)
    setExternalUrl('')
    setTitle('')
    setDescription('')
    setQty(1)
    setBudgetMax('')
    setDeliveryNeededBy('')
    setError(null)
    setResult(null)
    setCatalogMatch(null)
    setNeedsContact(false)
    setExternalResults(null)
    setUploadedImageUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const handleFileSelect = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Le fichier doit être une image (JPG, PNG, WebP).')
      return
    }
    if (f.size > MAX_IMAGE) {
      setError("Image trop volumineuse (max 8 Mo).")
      return
    }
    setError(null)
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => setFilePreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  // Phase 1 : recherche catalogue (sans contact)
  const handleSearch = useCallback(async () => {
    setError(null)
    if (tab === 'photo' && !file) {
      setError('Ajoutez une photo du produit recherché.')
      return
    }
    if (tab === 'link') {
      try {
        const u = new URL(externalUrl)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('proto')
      } catch {
        setError('Lien invalide.')
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        source: tab,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        qty: Math.max(1, Math.floor(qty || 1)),
        budgetMaxFCFA: budgetMax ? Number(budgetMax) : undefined,
        deliveryNeededBy: deliveryNeededBy || undefined,
        externalUrl: tab === 'link' ? externalUrl.trim() : undefined
      }

      let token = csrfToken || (await fetchCsrfToken())

      const doSearch = async (csrf: string | null): Promise<Response> => {
        const headers: Record<string, string> = {}
        if (csrf) headers['X-CSRF-Token'] = csrf
        if (file) {
          const form = new FormData()
          form.append('payload', JSON.stringify(payload))
          form.append('image', file)
          return fetch('/api/market/sourcing', {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers
          })
        }
        return fetch('/api/market/sourcing', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      }

      let res = await doSearch(token)
      if (res.status === 403) {
        const peek = await res.clone().json().catch(() => ({} as any))
        if (typeof peek?.error === 'string' && /CSRF/i.test(peek.error)) {
          const fresh = await fetchCsrfToken()
          if (fresh) res = await doSearch(fresh)
        }
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Échec de la recherche')
      }
      if (data.catalogMatch) {
        setCatalogMatch(data.catalogMatch as CatalogMatch)
        setPhase('match')
        return
      }
      if (data.needsContact) {
        setNeedsContact(true)
        // Si une image est présente, chercher aussi sur 1688 avant de demander le contact
        if (file && data.imageUrl) {
          setUploadedImageUrl(data.imageUrl)
          setPhase('searching_external')
          return
        }
        setPhase('contact')
        return
      }
      // Connecté avec phone connu → sourcing créé directement
      if (data.request) {
        setResult(data.request as CreatedResult)
        setPhase('result')
      }
    } catch (err: any) {
      setError(err?.message || 'Échec de la recherche.')
    } finally {
      setSubmitting(false)
    }
  }, [tab, file, externalUrl, title, description, qty, budgetMax, deliveryNeededBy, csrfToken, fetchCsrfToken])

  // Recherche externe 1688 par image
  const handleSearchExternal = useCallback(async (imageUrl: string) => {
    if (!imageUrl?.trim()) {
      console.warn('[handleSearchExternal] imageUrl vide, skip')
      setPhase('contact')
      return
    }
    setError(null)
    try {
      const token = csrfToken || (await fetchCsrfToken())
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['X-CSRF-Token'] = token
      const res = await fetch('/api/market/sourcing/search-external', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageUrl, description: description.trim() || undefined })
      })
      const data = await res.json().catch(() => ({}))
      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        setExternalResults(data.results)
        setPhase('external_results')
      } else {
        // Pas de résultats 1688 → fallback contact
        setExternalResults(null)
        setPhase('contact')
      }
    } catch (err: any) {
      console.log('[SearchExternal] échoué:', err.message)
      setPhase('contact')
    }
  }, [description, csrfToken, fetchCsrfToken])

  // Auto-lancer la recherche externe quand on passe en phase searching_external
  useEffect(() => {
    if (phase !== 'searching_external') return
    if (!uploadedImageUrl) {
      setPhase('contact')
      return
    }
    handleSearchExternal(uploadedImageUrl)
  }, [phase, uploadedImageUrl, handleSearchExternal])

  // Phase 2 : créer le sourcing avec contact
  const handleConfirmSourcing = useCallback(async () => {
    setError(null)
    if (!phone.trim()) {
      setError('Numéro de téléphone requis pour vous répondre sous 24h ouvrées.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        source: tab,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        qty: Math.max(1, Math.floor(qty || 1)),
        budgetMaxFCFA: budgetMax ? Number(budgetMax) : undefined,
        deliveryNeededBy: deliveryNeededBy || undefined,
        externalUrl: tab === 'link' ? externalUrl.trim() : undefined,
        contactPhone: phone.trim(),
        contactName: contactName.trim() || undefined,
        contactEmail: email.trim() || undefined,
        externalSearchResults: externalResults || undefined
      }

      let token = csrfToken || (await fetchCsrfToken())

      const doSubmit = async (csrf: string | null): Promise<Response> => {
        const headers: Record<string, string> = {}
        if (csrf) headers['X-CSRF-Token'] = csrf
        if (file) {
          const form = new FormData()
          form.append('payload', JSON.stringify(payload))
          form.append('image', file)
          return fetch('/api/market/sourcing', {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers
          })
        }
        return fetch('/api/market/sourcing', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      }

      let res = await doSubmit(token)
      if (res.status === 403) {
        const peek = await res.clone().json().catch(() => ({} as any))
        if (typeof peek?.error === 'string' && /CSRF/i.test(peek.error)) {
          const fresh = await fetchCsrfToken()
          if (fresh) res = await doSubmit(fresh)
        }
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Échec de la soumission')
      }
      setResult(data.request as CreatedResult)
      setPhase('result')
    } catch (err: any) {
      setError(err?.message || 'Échec de l\'envoi.')
    } finally {
      setSubmitting(false)
    }
  }, [tab, file, externalUrl, title, description, qty, budgetMax, deliveryNeededBy, phone, contactName, email, csrfToken, fetchCsrfToken])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-gray-950 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/20 rounded-xl">
                <Sparkles className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Trouvez-moi ce produit
                  <Sparkles className="h-4 w-4 text-violet-400" />
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  Envoyez une photo, on le <span className="text-violet-600 font-semibold">sourcer en Chine</span> sous 24h
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 flex-1">
            {phase === 'match' && catalogMatch ? (
              <CatalogMatchView
                match={catalogMatch}
                onViewProduct={() => {
                  handleClose()
                  router.push(`/produits/${catalogMatch.id}`)
                }}
                onContinueSourcing={() => {
                  setCatalogMatch(null)
                  setPhase('contact')
                }}
                onClose={handleClose}
              />
            ) : phase === 'searching_external' ? (
              <div className="text-center py-10">
                <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4 animate-pulse">
                  <Search className="h-9 w-9 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Nous recherchons votre produit en Chine…
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                  Notre moteur scrute 1688.com avec votre photo. Cela prend environ 15 secondes.
                </p>
                <div className="mt-6 flex justify-center">
                  <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                </div>
                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                  Pas de résultat ? Nous vous recontacterons sous 24h ouvrées.
                </p>
              </div>
            ) : phase === 'external_results' && externalResults ? (
              <ExternalResultsView
                results={externalResults}
                onSelect={(url: string) => {
                  setExternalUrl(url)
                  setTab('link')
                  setPhase('contact')
                }}
                onSkip={() => setPhase('contact')}
                onClose={handleClose}
              />
            ) : phase === 'result' && result ? (
              <SuccessView result={result} onClose={handleClose} />
            ) : phase === 'contact' ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Produit non trouvé</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Nous recherchons en Chine. Laissez-nous vos coordonnées pour une proposition sous 24h ouvrées.
                  </p>
                </div>
                <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-900/10 p-4 space-y-3">
                  <Field label="Téléphone (avec WhatsApp si possible)" required>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </Field>
                  <Field label="Nom (optionnel)">
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Votre nom"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </Field>
                  <Field label="Email (optionnel)">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@email.com"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </Field>
                </div>
                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="grid lg:grid-cols-[1fr_280px] gap-6">
                {/* Colonne gauche — formulaire */}
                <div>
                  {/* Tabs */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <TabButton active={tab === 'photo'} icon={Camera} label="Photo" onClick={() => setTab('photo')} />
                    <TabButton active={tab === 'link'} icon={LinkIcon} label="Lien" onClick={() => setTab('link')} />
                    <TabButton active={tab === 'text'} icon={FileText} label="Description" onClick={() => setTab('text')} />
                  </div>

                  {/* Tab content */}
                  {tab === 'photo' && (
                    <PhotoTab
                      file={file}
                      preview={filePreview}
                      fileInputRef={fileInputRef}
                      onFile={handleFileSelect}
                      onClear={() => {
                        setFile(null)
                        setFilePreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    />
                  )}
                  {tab === 'link' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Lien du produit
                      </label>
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://www.aliexpress.com/item/..."
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        AliExpress, Amazon, Instagram, TikTok Shop, site fournisseur…
                      </p>
                    </div>
                  )}
                  {tab === 'text' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Décrivez simplement votre besoin ci-dessous, nous trouverons le produit qui correspond.
                    </p>
                  )}

                  {/* Champs communs */}
                  <div className="mt-5 space-y-4">
                    <Field label="Nom court du produit (optionnel)">
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="ex: Perceuse 18V sans fil"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        maxLength={200}
                      />
                    </Field>
                    <Field label="Description / précisions (optionnel)">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Marque souhaitée, taille, couleur, usage prévu, alternatives acceptées…"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                        maxLength={4000}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Quantité">
                        <input
                          type="number"
                          min={1}
                          value={qty}
                          onChange={(e) => setQty(Number(e.target.value) || 1)}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </Field>
                      <Field label="Budget max (FCFA, optionnel)">
                        <input
                          type="number"
                          min={0}
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          placeholder="ex: 50000"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </Field>
                    </div>
                    <Field label="Date limite souhaitée (optionnel)">
                      <input
                        type="date"
                        value={deliveryNeededBy}
                        onChange={(e) => setDeliveryNeededBy(e.target.value)}
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </Field>
                  </div>

                  {error && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  )}
                </div>

                {/* Colonne droite — Comment ça marche ? */}
                <div className="hidden lg:block">
                  <HowItWorksSteps />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {(phase === 'searching_external' || phase === 'external_results') && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {phase === 'searching_external' ? 'Recherche en cours sur 1688…' : 'Résultats 1688 trouvés'}
              </p>
              {phase === 'external_results' && (
                <button
                  type="button"
                  onClick={() => setPhase('contact')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-medium text-sm transition-colors"
                >
                  Passer → Contact
                </button>
              )}
            </div>
          )}
          {phase === 'search' && (
            <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
              <SocialProofBar />
              <div className="px-6 py-4 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Sans engagement — recherche en Chine, logistique sourcing
                </p>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-emerald-500 hover:opacity-90 text-white rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50 transition-opacity"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Recherche…
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" /> Rechercher
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {phase === 'contact' && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Réponse sous 24h ouvrées
              </p>
              <button
                type="button"
                onClick={handleConfirmSourcing}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-emerald-500 hover:opacity-90 text-white rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50 transition-opacity"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Confirmer la demande
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
        active
          ? 'bg-violet-600 text-white border-violet-600 shadow-md'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-violet-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function PhotoTab({
  file,
  preview,
  fileInputRef,
  onFile,
  onClear
}: {
  file: File | null
  preview: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFile: (f: File) => void
  onClear: () => void
}) {
  const [drag, setDrag] = useState(false)

  return (
    <div>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <img src={preview} alt="Aperçu" className="w-full max-h-72 object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-900/80 hover:bg-white rounded-full shadow-md"
            aria-label="Retirer l'image"
          >
            <X className="h-4 w-4 text-gray-700 dark:text-gray-200" />
          </button>
          {file && (
            <p className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
              {file.name} • {(file.size / 1024).toFixed(0)} Ko
            </p>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            const f = e.dataTransfer.files?.[0]
            if (f) onFile(f)
          }}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer bg-gradient-to-b from-violet-50/50 to-purple-50/30 dark:from-violet-900/10 dark:to-purple-900/5 ${
            drag
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : 'border-violet-300 dark:border-violet-800 hover:border-violet-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/20 flex items-center justify-center">
                <Camera className="h-10 w-10 text-violet-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                Glissez une photo ici ou cliquez pour uploader
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Formats acceptés : JPG, PNG, WebP · Max 10MB
              </p>
            </div>
            <button
              type="button"
              className="pointer-events-none inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200/50"
            >
              <Camera className="h-4 w-4" /> Choisir une photo
            </button>
            <p className="text-xs text-violet-600 font-medium">
              Ou prendre une photo avec ma caméra
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SuccessView({ result, onClose }: { result: CreatedResult; onClose: () => void }) {
  const sla = new Date(result.slaDueAt)
  return (
    <div className="text-center py-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Demande enregistrée !</h3>
      <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
        Nous vous répondons par <strong>SMS / WhatsApp</strong> avec un prix livré chez vous.
      </p>
      <div className="mt-5 inline-flex flex-col gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-5 py-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Référence</span>
        <span className="text-lg font-mono font-bold text-violet-700 dark:text-violet-300">{result.reference}</span>
      </div>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
        <Clock className="h-4 w-4 text-violet-600" />
        Réponse avant le{' '}
        <strong>
          {sla.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
        </strong>
      </p>
      <a
        href={result.trackUrl}
        className="mt-5 inline-block px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors"
      >
        Voir ma demande
      </a>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 block mx-auto text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Fermer
      </button>
    </div>
  )
}

function CatalogMatchView({
  match,
  onViewProduct,
  onContinueSourcing,
  onClose
}: {
  match: CatalogMatch
  onViewProduct: () => void
  onContinueSourcing: () => void
  onClose: () => void
}) {
  const formatPrice = (n: number | undefined | null, currency: string | undefined | null) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return 'Prix sur devis'
    return `${n.toLocaleString('fr-FR')} ${currency || 'FCFA'}`
  }

  const scoreColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    if (score >= 55) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-4"
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
        <Sparkles className="h-9 w-9 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
        Nous l&apos;avons trouvé !
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
        Ce produit correspond à votre photo dans notre catalogue
      </p>

      {/* Card produit */}
      <div className="mt-6 text-left rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden shadow-sm">
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
          <img
            src={match.image}
            alt={match.name}
            className="w-full h-full object-cover"
          />
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${scoreColor(match.finalScore)}`}>
            Match {match.finalScore}%
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide mb-1">
            {match.category || 'Produit'}
          </p>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
            {match.name}
          </h4>
          <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
            {formatPrice(match.price, match.currency)}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Forme {match.visualScore}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Couleur {match.colorScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onViewProduct}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg"
        >
          <Search className="h-4 w-4" />
          Voir la fiche produit
        </button>
        <button
          type="button"
          onClick={onContinueSourcing}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-medium text-sm transition-colors"
        >
          Ce n&apos;est pas le bon ? Demander un sourcing
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Fermer
        </button>
      </div>
    </motion.div>
  )
}

// ─── Timeline "Comment ça marche ?" ─────────────────────────────────────────

function HowItWorksSteps() {
  const steps = [
    { num: 1, icon: Camera, title: 'Envoyez votre photo', desc: "Capture d'écran, photo produit, croquis…" },
    { num: 2, icon: Search, title: 'Recherche intelligente', desc: 'Notre IA compare avec 10 000+ références' },
    { num: 3, icon: CheckCircle2, title: 'Résultats en 5 secondes', desc: 'Score de correspondance affiché' },
    { num: 4, icon: Globe, title: 'Pas trouvé ? On le source !', desc: 'Devis personnalisé en 24h depuis la Chine' },
  ]
  return (
    <div className="sticky top-0">
      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        Comment ça marche ?
      </h4>
      <div className="space-y-3 relative">
        {/* Ligne verticale connectrice */}
        <div className="absolute left-[19px] top-6 bottom-6 w-px bg-violet-100 dark:bg-violet-900/30" />
        {steps.map((s, i) => {
          const I = s.icon
          return (
            <div key={i} className="flex gap-3 relative">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center z-10">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{s.num}</span>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <I className="h-3.5 w-3.5 text-violet-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.title}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Barre social proof ─────────────────────────────────────────────────────

function SocialProofBar() {
  return (
    <div className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center gap-4 sm:gap-8 flex-wrap text-white">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-300" />
        <span className="text-sm font-bold">1200+</span>
        <span className="text-xs text-violet-200">produits trouvés cette semaine</span>
      </div>
      <div className="hidden sm:block w-px h-4 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <Star className="h-4 w-4 text-yellow-300" />
        <span className="text-sm font-bold">95%</span>
        <span className="text-xs text-violet-200">de matchs précis</span>
      </div>
      <div className="hidden sm:block w-px h-4 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-violet-200" />
        <span className="text-sm font-bold">24h</span>
        <span className="text-xs text-violet-200">délai sourcing</span>
      </div>
      <div className="hidden sm:block w-px h-4 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <Zap className="h-4 w-4 text-violet-200" />
        <span className="text-sm font-bold">1200+</span>
        <span className="text-xs text-violet-200">produits trouvés</span>
      </div>
    </div>
  )
}

function ExternalResultsView({
  results,
  onSelect,
  onSkip,
  onClose
}: {
  results: Array<{ title: string; price1688?: number; image: string; url: string; supplier?: string; minOrder?: number }>
  onSelect: (url: string) => void
  onSkip: () => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-2"
    >
      <div className="text-center mb-5">
        <div className="mx-auto w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3">
          <Search className="h-6 w-6 text-violet-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Produits trouvés sur 1688</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Sélectionnez le plus proche ou passez à la demande manuelle.
        </p>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {results.map((r, i) => (
          <div
            key={i}
            className="flex gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
          >
            <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
              <img src={r.image} alt={r.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.title}</p>
              <p className="text-sm text-violet-600 font-medium mt-0.5">
                {r.price1688 ? `¥${r.price1688.toLocaleString('fr-FR')}` : 'Prix sur demande'}
              </p>
              {r.supplier && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{r.supplier}</p>
              )}
              {r.minOrder && (
                <p className="text-xs text-gray-400 dark:text-gray-500">MOQ: {r.minOrder}</p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(r.url)}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Sourcer celui-ci
                </button>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Voir 1688 ↗
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-medium text-sm transition-colors"
        >
          Aucun ne correspond — Demander un sourcing manuel
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Fermer
        </button>
      </div>
    </motion.div>
  )
}
