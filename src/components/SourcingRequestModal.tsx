'use client'

/**
 * Modale "Trouvez-moi ce produit".
 * Le client soumet une photo, un lien externe et/ou une description.
 * - Si non connecté : téléphone requis (notification SMS sous 24h max).
 * - Si connecté : on utilise son téléphone enregistré (modifiable).
 * Confirmation finale : référence + lien de tracking.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
  Phone,
  Clock,
  Search
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
}

type CreatedResult = {
  id: string
  reference: string
  publicToken: string
  trackUrl: string
  slaDueAt: string
}

const MAX_IMAGE = 8 * 1024 * 1024

export default function SourcingRequestModal({ isOpen, onClose, currentUser }: SourcingRequestModalProps) {
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Réinitialiser les champs du compte quand currentUser change
  useEffect(() => {
    if (currentUser?.phone && !phone) setPhone(currentUser.phone)
    if (currentUser?.name && !contactName) setContactName(currentUser.name)
    if (currentUser?.email && !email) setEmail(currentUser.email)
  }, [currentUser, phone, contactName, email])

  const resetForm = useCallback(() => {
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

  const handleSubmit = useCallback(async () => {
    setError(null)
    if (description.trim().length < 3) {
      setError('Décrivez le produit en quelques mots.')
      return
    }
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
    if (!currentUser?.id && !phone.trim()) {
      setError('Numéro de téléphone requis pour vous répondre sous 24h.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        source: tab,
        title: title.trim() || undefined,
        description: description.trim(),
        qty: Math.max(1, Math.floor(qty || 1)),
        budgetMaxFCFA: budgetMax ? Number(budgetMax) : undefined,
        deliveryNeededBy: deliveryNeededBy || undefined,
        externalUrl: tab === 'link' ? externalUrl.trim() : undefined,
        contactPhone: phone.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: email.trim() || undefined
      }

      let res: Response
      if (file) {
        const form = new FormData()
        form.append('payload', JSON.stringify(payload))
        form.append('image', file)
        res = await fetch('/api/market/sourcing', { method: 'POST', body: form, credentials: 'include' })
      } else {
        res = await fetch('/api/market/sourcing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Échec de la soumission')
      }
      setResult(data.request as CreatedResult)
    } catch (err: any) {
      setError(err?.message || 'Échec de l\'envoi.')
    } finally {
      setSubmitting(false)
    }
  }, [tab, file, externalUrl, title, description, qty, budgetMax, deliveryNeededBy, phone, contactName, email, currentUser])

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
          className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-violet-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <Search className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Trouvez-moi ce produit</h2>
                <p className="text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  Réponse personnalisée sous 24h ouvrées
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
            {result ? (
              <SuccessView result={result} onClose={handleClose} />
            ) : (
              <>
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
                      AliExpress, Amazon, Instagram, TikTok Shop, site fournisseur… nous nous occupons du reste.
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
                  <Field label="Description / précisions" required>
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

                {/* Contact */}
                <div className="mt-6 rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-900/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="h-4 w-4 text-violet-600" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Comment vous joindre {currentUser?.id ? '' : '(sans compte requis)'}
                    </h4>
                  </div>
                  {!currentUser?.id && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      Pas besoin de créer un compte. Laissez-nous votre numéro et nous vous envoyons la proposition par SMS sous 24h max.
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Téléphone (avec WhatsApp si possible)" required={!currentUser?.id}>
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
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!result && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Sans engagement — prix livré chez vous, frais inclus
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-emerald-500 hover:opacity-90 text-white rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50 transition-opacity"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Lancer la recherche
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
  fileInputRef: React.RefObject<HTMLInputElement>
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
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            drag
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
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
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Upload className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Glissez une photo ici
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ou <span className="text-violet-600 font-medium">cliquez pour parcourir</span> — JPG/PNG/WebP, max 8 Mo
              </p>
            </div>
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
