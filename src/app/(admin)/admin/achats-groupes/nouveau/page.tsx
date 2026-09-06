'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react'

type Product = {
  _id: string
  name: string
  image?: string
  currency?: string
  price?: number
  groupBuyEnabled?: boolean
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  priceTiers?: Array<{ minQty: number; maxQty?: number; price: number; discount?: number }>
}

type CreatePayload = {
  productId: string
  minQty: number
  targetQty: number
  maxQty?: number
  maxParticipants?: number
  deadline: string
  shippingMethod: 'maritime_60j' | 'air_15j' | 'express_3j'
  status: 'draft' | 'open'
  description?: string
  internalNotes?: string
  createdBy: { name: string; phone: string; email?: string }
}

const formatCurrency = (v?: number, currency = 'FCFA') =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} ${currency}` : '-'

export default function AdminCreateGroupOrderPage() {
  const [query, setQuery] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId) || null,
    [products, selectedProductId]
  )

  const [form, setForm] = useState<CreatePayload>({
    productId: '',
    minQty: 10,
    targetQty: 50,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    shippingMethod: 'maritime_60j',
    status: 'open',
    description: '',
    internalNotes: '',
    createdBy: { name: 'IT Vision', phone: '', email: '' }
  })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoadingProducts(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`, {
          credentials: 'include'
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Erreur chargement produits')

        const items: Product[] = Array.isArray(data?.items) ? data.items : []
        if (!cancelled) setProducts(items)
      } catch (e: any) {
        if (!cancelled) {
          setProducts([])
          setMessage({ type: 'error', text: e?.message || 'Erreur chargement produits' })
        }
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }

    const t = window.setTimeout(run, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query])

  useEffect(() => {
    if (!selectedProduct) return

    setForm((prev) => ({
      ...prev,
      productId: selectedProduct._id,
      minQty: typeof selectedProduct.groupBuyMinQty === 'number' ? selectedProduct.groupBuyMinQty : prev.minQty,
      targetQty: typeof selectedProduct.groupBuyTargetQty === 'number' ? selectedProduct.groupBuyTargetQty : prev.targetQty
    }))
  }, [selectedProduct])

  const create = async () => {
    if (!form.productId) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un produit.' })
      return
    }
    if (!form.createdBy.name || !form.createdBy.phone) {
      setMessage({ type: 'error', text: 'Contact requis: nom + téléphone.' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/group-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          deadline: new Date(form.deadline).toISOString()
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erreur création')
      }

      const groupId = data?.group?.groupId
      setMessage({ type: 'success', text: `Achat groupé créé (${groupId})` })
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Erreur création' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin/achats-groupes" className="text-sm font-semibold text-gray-700 hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Créer un achat groupé</h1>
              <p className="text-sm text-gray-600 mt-1">Sélectionne un produit, fixe les objectifs et la date limite.</p>
            </div>
            <button
              onClick={create}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {saving ? 'Création…' : 'Créer'}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900">Produit</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un produit…"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                  <div className="flex items-center text-xs text-gray-500">{loadingProducts ? '…' : `${products.length}`}</div>
                </div>

                <select
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                      {p.groupBuyEnabled ? '' : ' (group buy désactivé)'}
                    </option>
                  ))}
                </select>

                {selectedProduct && (
                  <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-sm">
                    <div className="font-semibold text-gray-900">{selectedProduct.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Prix: {formatCurrency(selectedProduct.price, selectedProduct.currency || 'FCFA')}
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Objectifs produit: min {selectedProduct.groupBuyMinQty ?? '-'} / cible {selectedProduct.groupBuyTargetQty ?? '-'}
                    </div>
                    {Array.isArray(selectedProduct.priceTiers) && selectedProduct.priceTiers.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-gray-700">Paliers de prix</div>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          {selectedProduct.priceTiers.slice(0, 6).map((t, idx) => (
                            <div key={idx} className="rounded-lg border bg-white p-2 text-xs">
                              <div className="text-gray-600">{t.minQty}+ unités</div>
                              <div className="font-bold text-gray-900">{formatCurrency(t.price, selectedProduct.currency || 'FCFA')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-900">Statut</label>
                  <select
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                  >
                    <option value="open">Ouvert</option>
                    <option value="draft">Brouillon</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-900">Deadline</label>
                  <input
                    type="date"
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.deadline}
                    onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-900">Transport</label>
                <select
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.shippingMethod}
                  onChange={(e) => setForm((p) => ({ ...p, shippingMethod: e.target.value as any }))}
                >
                  <option value="maritime_60j">Maritime (~60j)</option>
                  <option value="air_15j">Aérien (~15j)</option>
                  <option value="express_3j">Express (~3j)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-900">Description (optionnel)</label>
                <textarea
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-900">Objectif min</label>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.minQty}
                    min={1}
                    onChange={(e) => setForm((p) => ({ ...p, minQty: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-900">Objectif cible</label>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.targetQty}
                    min={form.minQty}
                    onChange={(e) => setForm((p) => ({ ...p, targetQty: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-900">Max unités (optionnel)</label>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.maxQty ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, maxQty: e.target.value === '' ? undefined : Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-900">Max participants (optionnel)</label>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    value={form.maxParticipants ?? ''}
                    onChange={(e) => setForm((p) => ({
                      ...p,
                      maxParticipants: e.target.value === '' ? undefined : Number(e.target.value)
                    }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-bold text-gray-900">Contact affiché côté public</div>
                <div className="text-xs text-gray-600 mt-1">C’est le contact qui apparaît sur la page de l’achat groupé.</div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Nom"
                    value={form.createdBy.name}
                    onChange={(e) => setForm((p) => ({ ...p, createdBy: { ...p.createdBy, name: e.target.value } }))}
                  />
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Téléphone"
                    value={form.createdBy.phone}
                    onChange={(e) => setForm((p) => ({ ...p, createdBy: { ...p.createdBy, phone: e.target.value } }))}
                  />
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Email (optionnel)"
                    value={form.createdBy.email}
                    onChange={(e) => setForm((p) => ({ ...p, createdBy: { ...p.createdBy, email: e.target.value } }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-900">Notes internes (optionnel)</label>
                <textarea
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={4}
                  value={form.internalNotes}
                  onChange={(e) => setForm((p) => ({ ...p, internalNotes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Conseil: si le produit n’a pas de paliers, configure-les dans l’admin produits.
            </div>
            <button
              onClick={create}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {saving ? 'Création…' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
