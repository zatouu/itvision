'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Search, Package, Truck, Settings, MapPin, Layers, Sparkles } from 'lucide-react'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'

type ShippingOverride = {
  methodId: string
  ratePerKg?: number
  ratePerM3?: number
  flatFee?: number
}

type Product = {
  _id?: string
  name: string
  category?: string
  description?: string
  tagline?: string
  price?: number
  baseCost?: number
  marginRate?: number
  currency?: string
  image?: string
  gallery?: string[]
  features?: string[]
  requiresQuote?: boolean
  deliveryDays?: number
  stockStatus?: 'in_stock' | 'preorder'
  stockQuantity?: number
  leadTimeDays?: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  availabilityNote?: string
  sourcing?: {
    platform?: string
    supplierName?: string
    supplierContact?: string
    productUrl?: string
    notes?: string
  }
  shippingOverrides?: ShippingOverride[]
  isPublished?: boolean
  isFeatured?: boolean
}

async function fetchProducts(q = '', category = '') {
  const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return (await res.json()).items as Product[]
}

const formatCurrency = (amount?: number, currency = 'FCFA') => {
  if (typeof amount !== 'number') return '-'
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

const ensureOverrides = (overrides?: ShippingOverride[]): ShippingOverride[] => {
  if (!Array.isArray(overrides)) return []
  return overrides.filter(o => o && typeof o.methodId === 'string')
}

export default function AdminProductManager() {
  const empty: Product = {
    name: '',
    category: '',
    description: '',
    tagline: '',
    price: undefined,
    baseCost: undefined,
    marginRate: 25,
    currency: 'FCFA',
    image: '',
    gallery: [],
    features: [],
    requiresQuote: false,
    stockStatus: 'preorder',
    stockQuantity: 0,
    leadTimeDays: 15,
    weightKg: undefined,
    lengthCm: undefined,
    widthCm: undefined,
    heightCm: undefined,
    volumeM3: undefined,
    availabilityNote: '',
    sourcing: {},
    shippingOverrides: [],
    isPublished: true,
    isFeatured: false
  }

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await fetchProducts(query, category)
      setItems(result.map(item => ({
        ...item,
        gallery: item.gallery || [],
        features: item.features || [],
        shippingOverrides: ensureOverrides(item.shippingOverrides)
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const onSave = async () => {
    if (!editing) return
    const method = editing._id ? 'PATCH' : 'POST'
    const payload: Record<string, unknown> = {
      ...editing,
      gallery: (editing.gallery || []).filter(Boolean),
      features: (editing.features || []).filter(Boolean),
      shippingOverrides: ensureOverrides(editing.shippingOverrides).map(override => ({
        ...override,
        ratePerKg: override.ratePerKg ?? undefined,
        ratePerM3: override.ratePerM3 ?? undefined,
        flatFee: override.flatFee ?? undefined
      }))
    }
    if (editing._id) payload.id = editing._id

    const res = await fetch('/api/products', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) return alert('Erreur lors de la sauvegarde')
    setEditing(null)
    await refresh()
  }

  const onDelete = async (id?: string) => {
    if (!id) return
    if (!confirm('Supprimer ce produit ?')) return
    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
    if (!res.ok) return alert('Suppression échouée')
    await refresh()
  }

  const computedDisplayPrice = (product: Product) => {
    if (typeof product.price === 'number') return formatCurrency(product.price, product.currency)
    if (typeof product.baseCost === 'number') {
      const margin = typeof product.marginRate === 'number' ? product.marginRate : 25
      const sale = Math.round(product.baseCost * (1 + margin / 100))
      return formatCurrency(sale, product.currency)
    }
    return '-'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Produits</h1>
          <p className="text-sm text-gray-500">Pilotez votre sourcing Chine & vos tarifs transport depuis une seule interface.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm">
          <Plus className="h-4 w-4" /> Nouveau produit
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher par nom" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Catégorie" className="w-48 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={refresh} className="px-4 py-2 border rounded-lg text-sm">Filtrer</button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Produit</th>
              <th className="text-left p-3">Catégorie</th>
              <th className="text-left p-3">Tarif</th>
              <th className="text-left p-3">Disponibilité</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500"><Loader2 className="h-4 w-4 inline animate-spin" /> Chargement...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Aucun produit</td></tr>
            ) : (
              items.map(product => (
                <tr key={product._id} className="border-t">
                  <td className="p-3">
                    <div className="font-semibold text-gray-900">{product.name}</div>
                    {product.tagline && <div className="text-xs text-gray-500 mt-0.5">{product.tagline}</div>}
                  </td>
                  <td className="p-3 text-gray-600">
                    <div className="text-sm">{product.category || '-'}</div>
                    <div className="text-xs text-gray-400 mt-1">{product.requiresQuote ? 'Sur devis' : 'Tarif direct'}</div>
                  </td>
                  <td className="p-3 text-gray-900">
                    <div className="text-sm font-semibold text-emerald-600">{computedDisplayPrice(product)}</div>
                    {typeof product.baseCost === 'number' && (
                      <div className="text-xs text-gray-500">Coût: {formatCurrency(product.baseCost, product.currency)}</div>
                    )}
                    {typeof product.marginRate === 'number' && (
                      <div className="text-xs text-gray-400">Marge: {product.marginRate}%</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${product.stockStatus === 'in_stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      <Package className="h-3.5 w-3.5" /> {product.stockStatus === 'in_stock' ? 'Stock Dakar' : 'Commande Chine'}
                    </div>
                    {typeof product.leadTimeDays === 'number' && (
                      <div className="text-xs text-gray-500 mt-1">{product.leadTimeDays} jours estimés</div>
                    )}
                    {product.weightKg && <div className="text-xs text-gray-400 mt-1">{product.weightKg} kg</div>}
                  </td>
                  <td className="p-3 text-right">
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded border mr-2" onClick={() => setEditing({ ...empty, ...product, gallery: product.gallery || [], features: product.features || [], shippingOverrides: ensureOverrides(product.shippingOverrides), sourcing: product.sourcing || {} })}><Pencil className="h-4 w-4" /> Éditer</button>
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded border text-red-600" onClick={() => onDelete(product._id)}><Trash2 className="h-4 w-4" /> Supprimer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl p-6 my-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {editing._id ? 'Modifier' : 'Nouveau'} produit
              {!editing._id && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Import Chine & tarifs transport</span>}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide"><Sparkles className="h-4 w-4" /> Détails produit</div>
                  <input className="border rounded-lg px-3 py-2" placeholder="Nom du produit" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                  <input className="border rounded-lg px-3 py-2" placeholder="Tagline / bénéfice principal" value={editing.tagline || ''} onChange={e => setEditing({ ...editing, tagline: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-lg px-3 py-2" placeholder="Catégorie" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} />
                    <select className="border rounded-lg px-3 py-2" value={editing.stockStatus || 'preorder'} onChange={e => setEditing({ ...editing, stockStatus: e.target.value as Product['stockStatus'] })}>
                      <option value="in_stock">Disponible à Dakar</option>
                      <option value="preorder">Commande Chine</option>
                    </select>
                  </div>
                  <textarea className="border rounded-lg px-3 py-2" rows={4} placeholder="Description détaillée" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                  <div className="flex items-center gap-4 text-sm text-gray-700">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.isPublished} onChange={e => setEditing({ ...editing, isPublished: e.target.checked })} /> Visible sur la boutique</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.isFeatured} onChange={e => setEditing({ ...editing, isFeatured: e.target.checked })} /> Mettre en avant</label>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide"><Layers className="h-4 w-4" /> Media & avantages</div>
                  <input className="border rounded-lg px-3 py-2" placeholder="Image principale (URL)" value={editing.image || ''} onChange={e => setEditing({ ...editing, image: e.target.value })} />
                  <label className="text-xs text-gray-500 space-y-1">
                    Galerie (1 URL par ligne)
                    <textarea className="border rounded-lg px-3 py-2 text-sm" rows={3} value={(editing.gallery || []).join('\n')} onChange={e => setEditing({ ...editing, gallery: e.target.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean) })} />
                  </label>
                  <label className="text-xs text-gray-500 space-y-1">
                    Points forts (1 par ligne)
                    <textarea className="border rounded-lg px-3 py-2 text-sm" rows={4} value={(editing.features || []).join('\n')} onChange={e => setEditing({ ...editing, features: e.target.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean) })} />
                  </label>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide"><MapPin className="h-4 w-4" /> Sourcing Chine</div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <label className="space-y-1">
                      Plateforme
                      <select className="border rounded-lg px-3 py-2" value={editing.sourcing?.platform || ''} onChange={e => setEditing({ ...editing, sourcing: { ...editing.sourcing, platform: e.target.value || undefined } })}>
                        <option value="">--</option>
                        <option value="aliexpress">AliExpress</option>
                        <option value="1688">1688</option>
                        <option value="alibaba">Alibaba</option>
                        <option value="taobao">Taobao</option>
                        <option value="factory">Usine partenaire</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      Fournisseur / Contact
                      <input className="border rounded-lg px-3 py-2" value={editing.sourcing?.supplierName || ''} onChange={e => setEditing({ ...editing, sourcing: { ...editing.sourcing, supplierName: e.target.value || undefined } })} />
                    </label>
                    <label className="space-y-1">
                      Coordonnées (WeChat / Tel)
                      <input className="border rounded-lg px-3 py-2" value={editing.sourcing?.supplierContact || ''} onChange={e => setEditing({ ...editing, sourcing: { ...editing.sourcing, supplierContact: e.target.value || undefined } })} />
                    </label>
                    <label className="space-y-1">
                      Lien produit
                      <input className="border rounded-lg px-3 py-2" value={editing.sourcing?.productUrl || ''} onChange={e => setEditing({ ...editing, sourcing: { ...editing.sourcing, productUrl: e.target.value || undefined } })} />
                    </label>
                    <label className="space-y-1 col-span-2">
                      Notes internes
                      <textarea className="border rounded-lg px-3 py-2" rows={2} value={editing.sourcing?.notes || ''} onChange={e => setEditing({ ...editing, sourcing: { ...editing.sourcing, notes: e.target.value || undefined } })} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide"><Package className="h-4 w-4" /> Tarification & marge</div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <label className="space-y-1">
                      Prix public (optionnel)
                      <input className="border rounded-lg px-3 py-2" type="number" value={editing.price ?? ''} onChange={e => setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Coût fournisseur (FCFA)
                      <input className="border rounded-lg px-3 py-2" type="number" value={editing.baseCost ?? ''} onChange={e => setEditing({ ...editing, baseCost: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Marge (%)
                      <input className="border rounded-lg px-3 py-2" type="number" value={editing.marginRate ?? ''} onChange={e => setEditing({ ...editing, marginRate: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Devise
                      <input className="border rounded-lg px-3 py-2" value={editing.currency || 'FCFA'} onChange={e => setEditing({ ...editing, currency: e.target.value })} />
                    </label>
                    <label className="space-y-1">
                      Stock (Qté)
                      <input className="border rounded-lg px-3 py-2" type="number" value={editing.stockQuantity ?? ''} onChange={e => setEditing({ ...editing, stockQuantity: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Promesse client (jours)
                      <input className="border rounded-lg px-3 py-2" type="number" value={editing.leadTimeDays ?? ''} onChange={e => setEditing({ ...editing, leadTimeDays: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                  </div>
                  <label className="space-y-1 text-xs text-gray-500">
                    Message disponibilité / logistique
                    <textarea className="border rounded-lg px-3 py-2 text-sm" rows={2} value={editing.availabilityNote || ''} onChange={e => setEditing({ ...editing, availabilityNote: e.target.value })} />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={!!editing.requiresQuote} onChange={e => setEditing({ ...editing, requiresQuote: e.target.checked })} />
                    Sur devis uniquement (cacher achat direct)
                  </label>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide"><Truck className="h-4 w-4" /> Logistique & transport</div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <label className="space-y-1">
                      Poids (kg)
                      <input className="border rounded-lg px-3 py-2" type="number" min="0" step="0.01" value={editing.weightKg ?? ''} onChange={e => setEditing({ ...editing, weightKg: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Volume (m³)
                      <input className="border rounded-lg px-3 py-2" type="number" min="0" step="0.001" value={editing.volumeM3 ?? ''} onChange={e => setEditing({ ...editing, volumeM3: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Longueur (cm)
                      <input className="border rounded-lg px-3 py-2" type="number" min="0" step="0.1" value={editing.lengthCm ?? ''} onChange={e => setEditing({ ...editing, lengthCm: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Largeur (cm)
                      <input className="border rounded-lg px-3 py-2" type="number" min="0" step="0.1" value={editing.widthCm ?? ''} onChange={e => setEditing({ ...editing, widthCm: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                    <label className="space-y-1">
                      Hauteur (cm)
                      <input className="border rounded-lg px-3 py-2" type="number" min="0" step="0.1" value={editing.heightCm ?? ''} onChange={e => setEditing({ ...editing, heightCm: e.target.value ? Number(e.target.value) : undefined })} />
                    </label>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2 text-xs uppercase font-semibold text-gray-600"><Settings className="h-3.5 w-3.5" /> Ajustements transport</div>
                    <div className="space-y-3">
                      {Object.values(BASE_SHIPPING_RATES).map(method => {
                        const override = (editing.shippingOverrides || []).find(o => o.methodId === method.id)
                        return (
                          <div key={method.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-gray-800">{method.label}</div>
                                <div className="text-xs text-gray-500">{method.description}</div>
                              </div>
                              <div className="text-[11px] uppercase text-gray-400">Base: {method.billing === 'per_kg' ? `${method.rate.toLocaleString()} FCFA/kg` : `${method.rate.toLocaleString()} FCFA/m³`}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-gray-500">
                              {method.billing === 'per_kg' && (
                                <label className="space-y-1">
                                  Tarif perso (FCFA/kg)
                                  <input className="border rounded px-2 py-1 text-sm" type="number" value={override?.ratePerKg ?? ''} onChange={e => {
                                    const value = e.target.value ? Number(e.target.value) : undefined
                                    setEditing(prev => {
                                      if (!prev) return prev
                                      const overrides = ensureOverrides(prev.shippingOverrides)
                                      const index = overrides.findIndex(o => o.methodId === method.id)
                                      if (index >= 0) overrides[index] = { ...overrides[index], ratePerKg: value }
                                      else overrides.push({ methodId: method.id, ratePerKg: value })
                                      return { ...prev, shippingOverrides: overrides }
                                    })
                                  }} />
                                </label>
                              )}
                              {method.billing === 'per_cubic_meter' && (
                                <label className="space-y-1">
                                  Tarif perso (FCFA/m³)
                                  <input className="border rounded px-2 py-1 text-sm" type="number" value={override?.ratePerM3 ?? ''} onChange={e => {
                                    const value = e.target.value ? Number(e.target.value) : undefined
                                    setEditing(prev => {
                                      if (!prev) return prev
                                      const overrides = ensureOverrides(prev.shippingOverrides)
                                      const index = overrides.findIndex(o => o.methodId === method.id)
                                      if (index >= 0) overrides[index] = { ...overrides[index], ratePerM3: value }
                                      else overrides.push({ methodId: method.id, ratePerM3: value })
                                      return { ...prev, shippingOverrides: overrides }
                                    })
                                  }} />
                                </label>
                              )}
                              <label className="space-y-1">
                                Supplément fixe (FCFA)
                                <input className="border rounded px-2 py-1 text-sm" type="number" value={override?.flatFee ?? ''} onChange={e => {
                                  const value = e.target.value ? Number(e.target.value) : undefined
                                  setEditing(prev => {
                                    if (!prev) return prev
                                    const overrides = ensureOverrides(prev.shippingOverrides)
                                    const index = overrides.findIndex(o => o.methodId === method.id)
                                    if (index >= 0) overrides[index] = { ...overrides[index], flatFee: value }
                                    else overrides.push({ methodId: method.id, flatFee: value })
                                    return { ...prev, shippingOverrides: overrides }
                                  })
                                }} />
                              </label>
                              <div className="flex items-end justify-end">
                                <button className="text-[11px] text-emerald-600 hover:text-emerald-700" type="button" onClick={() => setEditing(prev => {
                                  if (!prev) return prev
                                  return { ...prev, shippingOverrides: ensureOverrides(prev.shippingOverrides).filter(o => o.methodId !== method.id) }
                                })}>Réinitialiser</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setEditing(null)}>Annuler</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={onSave}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

