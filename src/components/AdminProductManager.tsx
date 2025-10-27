'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react'

type Product = {
  _id?: string
  name: string
  category?: string
  description?: string
  price?: number
  currency?: string
  image?: string
  requiresQuote?: boolean
  deliveryDays?: number
}

async function fetchProducts(q = '', category = '') {
  const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return (await res.json()).items as Product[]
}

export default function AdminProductManager() {
  const empty: Product = { name: '', category: '', description: '', price: undefined, currency: 'Fcfa', image: '', requiresQuote: false }
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const refresh = async () => {
    setLoading(true)
    try { setItems(await fetchProducts(query, category)) } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  const onSave = async () => {
    if (!editing) return
    const method = editing._id ? 'PATCH' : 'POST'
    const body = editing._id ? { id: editing._id, ...editing } : editing
    const res = await fetch('/api/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion des Produits</h1>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> Nouveau produit
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Catégorie" className="w-48 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={refresh} className="px-4 py-2 border rounded-lg text-sm">Filtrer</button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Catégorie</th>
              <th className="text-left p-3">Prix</th>
              <th className="text-left p-3">Devis</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500"><Loader2 className="h-4 w-4 inline animate-spin" /> Chargement...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Aucun produit</td></tr>
            ) : (
              items.map(p => (
                <tr key={p._id} className="border-t">
                  <td className="p-3 font-medium text-gray-900">{p.name}</td>
                  <td className="p-3 text-gray-600">{p.category}</td>
                  <td className="p-3 text-gray-900">{p.price?.toLocaleString?.()}{p.price ? ` ${p.currency || 'Fcfa'}` : ''}</td>
                  <td className="p-3">{p.requiresQuote ? 'Oui' : 'Non'}</td>
                  <td className="p-3 text-right">
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded border mr-2" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /> Éditer</button>
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded border text-red-600" onClick={() => onDelete(p._id)}><Trash2 className="h-4 w-4" /> Supprimer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer simple modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editing._id ? 'Modifier' : 'Nouveau'} produit</h3>
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 col-span-2" placeholder="Nom" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Catégorie" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Prix (optionnel)" type="number" value={editing.price ?? ''} onChange={e => setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : undefined })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Devise" value={editing.currency || 'Fcfa'} onChange={e => setEditing({ ...editing, currency: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 col-span-2" placeholder="Image URL" value={editing.image || ''} onChange={e => setEditing({ ...editing, image: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Délai livraison (jours)" type="number" value={editing.deliveryDays ?? 0} onChange={e => setEditing({ ...editing, deliveryDays: e.target.value ? Number(e.target.value) : 0 })} />
              <textarea className="border rounded-lg px-3 py-2 col-span-2" placeholder="Description" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              <label className="col-span-2 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.requiresQuote} onChange={e => setEditing({ ...editing, requiresQuote: e.target.checked })} /> Sur devis (désactive le prix)</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setEditing(null)}>Annuler</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={onSave}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


