'use client'

import { useEffect, useState } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import { Store, Loader2, CheckCircle, XCircle, Plus, Search } from 'lucide-react'

interface Shop {
  _id: string
  name: string
  slug: string
  description?: string
  logo?: string
  ownerEmail?: string
  ownerPhone?: string
  status: 'active' | 'inactive' | 'suspended'
  isVerified: boolean
  createdAt: string
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', ownerEmail: '', ownerPhone: '' })

  const loadShops = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/shops', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setShops(data.shops || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadShops() }, [])

  const createShop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      setCreating(true)
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setForm({ name: '', description: '', ownerEmail: '', ownerPhone: '' })
      await loadShops()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setCreating(false)
    }
  }

  const toggleStatus = async (shop: Shop, status: 'active' | 'inactive' | 'suspended') => {
    try {
      const res = await fetch(`/api/admin/shops/${shop._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      await loadShops()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="pt-2 pb-6">
      <Breadcrumb backHref="/admin/marketplace" backLabel="Retour marketplace" />

      <div className="max-w-6xl mx-auto px-4 mt-4">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
          <Store className="h-6 w-6 text-emerald-600" />
          Gestion des boutiques
        </h1>

        <form onSubmit={createShop} className="bg-white rounded-xl border border-stone-200 p-4 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Nom de la boutique"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email propriétaire"
            value={form.ownerEmail}
            onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Téléphone propriétaire"
            value={form.ownerPhone}
            onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creating}
            className="md:col-span-2 lg:col-span-4 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Création…' : 'Créer une boutique'}
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-12 text-stone-500">Aucune boutique.</div>
        ) : (
          <div className="space-y-3">
            {shops.map(shop => (
              <div key={shop._id} className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-900">{shop.name}</h3>
                    {shop.isVerified ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-stone-400" />}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${shop.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'}`}>
                      {shop.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600">{shop.description || 'Pas de description'}</p>
                  <p className="text-xs text-stone-500 mt-1">Slug: {shop.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatus(shop, shop.status === 'active' ? 'inactive' : 'active')}
                    className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm hover:bg-stone-50"
                  >
                    {shop.status === 'active' ? 'Désactiver' : 'Activer'}
                  </button>
                  <a
                    href={`/boutiques/${shop.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                  >
                    Voir
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
