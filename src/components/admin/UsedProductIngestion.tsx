'use client'

import { useMemo, useState } from 'react'

type Condition = 'new' | 'used' | 'refurbished'

type Draft = {
  name: string
  description: string | null
  image: string
  gallery: string[]
  sourceUrl: string
  videoUrl: string | null
}

export default function UsedProductIngestion() {
  const [sourceUrl, setSourceUrl] = useState('')
  const [platform, setPlatform] = useState('xianyu')
  const [condition, setCondition] = useState<Condition>('used')

  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [draft, setDraft] = useState<Draft | null>(null)

  // Editable fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Occasion (Chine)')
  const [tagline, setTagline] = useState('')
  const [price, setPrice] = useState<string>('')
  const [currency, setCurrency] = useState('FCFA')
  const [requiresQuote, setRequiresQuote] = useState(true)
  const [images, setImages] = useState<string>('')

  const mergedGallery = useMemo(() => {
    const manual = images
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const auto = draft?.gallery || []
    const video = draft?.videoUrl ? [draft.videoUrl] : []

    const seen = new Set<string>()
    const out: string[] = []
    for (const u of [...video, ...manual, ...auto]) {
      if (!u || seen.has(u)) continue
      seen.add(u)
      out.push(u)
    }
    return out.slice(0, 20)
  }, [images, draft])

  const handlePreview = async () => {
    setError(null)
    setSuccess(null)
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/admin/ingestion/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Preview failed')

      setDraft(data.draft)
      setName(data.draft?.name || '')
      setDescription(data.draft?.description || '')
      setImages((data.draft?.gallery || []).filter(Boolean).join('\n'))

      // For second-hand, default to quote unless user sets a price.
      setRequiresQuote(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleCreate = async () => {
    setError(null)
    setSuccess(null)
    setLoadingCreate(true)
    try {
      const body = {
        platform,
        condition,
        sourceUrl: draft?.sourceUrl || sourceUrl,
        name,
        category,
        tagline: tagline || undefined,
        description: description || undefined,
        currency,
        requiresQuote,
        price: price.trim() ? Number(price) : undefined,
        image: mergedGallery[0] || draft?.image,
        gallery: mergedGallery,
        videoUrl: draft?.videoUrl || undefined
      }

      const res = await fetch('/api/admin/ingestion/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Create failed')

      setSuccess(`Produit créé: ${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoadingCreate(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ingestion produits (Occasion / Refurb)</h1>
            <p className="text-sm text-gray-600 mt-1">
              Collez une URL (site de vente entre particuliers), prévisualisez, puis créez un produit dans le catalogue.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">URL source</label>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!sourceUrl.trim() || loadingPreview}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadingPreview ? 'Prévisualisation…' : 'Prévisualiser'}
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700">Source</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="xianyu">Xianyu / Idle Fish</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="used">Occasion</option>
                <option value="refurbished">Refurb</option>
                <option value="new">Neuf</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="requires-quote"
                type="checkbox"
                checked={requiresQuote}
                onChange={(e) => setRequiresQuote(e.target.checked)}
              />
              <label htmlFor="requires-quote" className="text-sm font-semibold text-gray-700">
                Sur devis
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Catégorie</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Tagline</label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Prix</label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 250000"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Devise</label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Images (1 URL par ligne)</label>
              <textarea
                value={images}
                onChange={(e) => setImages(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-mono"
              />
              <div className="mt-2 text-xs text-gray-500">
                La vidéo (si détectée) est ajoutée automatiquement en tête de galerie.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={loadingCreate || !name.trim()}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {loadingCreate ? 'Création…' : 'Créer le produit'}
              </button>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-700">Aperçu galerie</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {mergedGallery.length === 0 ? (
                  <div className="col-span-2 text-sm text-gray-500">Aucune image détectée.</div>
                ) : (
                  mergedGallery.slice(0, 6).map((u) => (
                    <div key={u} className="rounded-xl border border-gray-200 bg-white p-2 text-xs break-all">
                      {u}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {mergedGallery.length > 6 ? `+${mergedGallery.length - 6} autres…` : ''}
              </div>
            </div>

            {draft?.videoUrl && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-gray-700">Vidéo détectée</div>
                <div className="mt-2 text-xs text-gray-600 break-all">{draft.videoUrl}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
