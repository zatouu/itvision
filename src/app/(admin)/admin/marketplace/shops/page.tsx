'use client'

import { useEffect, useState } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import { Store, Loader2, CheckCircle, XCircle, Plus, Search, Wallet } from 'lucide-react'

interface Payout {
  id: string
  vendor?: { name: string; slug: string } | null
  amount: number
  method: string
  phone?: string
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  note?: string
  requestedAt: string
  rejectionReason?: string
}

interface Shop {
  _id: string
  name: string
  slug: string
  description?: string
  logo?: string
  ownerEmail?: string
  ownerPhone?: string
  status: 'pending_review' | 'active' | 'inactive' | 'suspended'
  isVerified: boolean
  createdAt: string
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', ownerEmail: '', ownerPhone: '' })
  const [payouts, setPayouts] = useState<Payout[]>([])

  const loadPayouts = async () => {
    try {
      const res = await fetch('/api/admin/vendor-payouts', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setPayouts(data.payouts || [])
    } catch {}
  }

  const processPayout = async (id: string, action: 'approve' | 'paid' | 'reject') => {
    let rejectionReason: string | undefined
    if (action === 'reject') {
      rejectionReason = window.prompt('Motif du rejet ?') || 'Non précisé'
    }
    try {
      const res = await fetch('/api/admin/vendor-payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payoutId: id, action, rejectionReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      await loadPayouts()
    } catch (e: any) {
      alert(e.message)
    }
  }

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

  useEffect(() => { loadShops(); loadPayouts() }, [])

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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${shop.status === 'active' ? 'bg-emerald-100 text-emerald-800' : shop.status === 'pending_review' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'}`}>
                      {shop.status === 'pending_review' ? 'En attente' : shop.status}
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
                    {shop.status === 'active' ? 'Désactiver' : shop.status === 'pending_review' ? 'Approuver' : 'Activer'}
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

        {/* Retraits vendeurs */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Demandes de retrait
          </h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-stone-500 rounded-xl border border-dashed border-stone-300 p-4 text-center">Aucune demande de retrait.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-stone-900">{p.amount.toLocaleString('fr-FR')} F</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'paid' ? 'bg-emerald-100 text-emerald-800'
                        : p.status === 'pending' ? 'bg-amber-100 text-amber-800'
                        : p.status === 'approved' ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                        {p.status === 'paid' ? 'Versé' : p.status === 'pending' ? 'En attente' : p.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 mt-0.5">
                      {p.vendor?.name || 'Vendeur'} · {p.method} {p.phone ? `· ${p.phone}` : ''} · {new Date(p.requestedAt).toLocaleDateString('fr-FR')}
                    </p>
                    {p.rejectionReason && <p className="text-xs text-red-600 mt-0.5">Motif : {p.rejectionReason}</p>}
                  </div>
                  <div className="flex gap-2">
                    {p.status === 'pending' && (
                      <button onClick={() => processPayout(p.id, 'approve')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        Approuver
                      </button>
                    )}
                    {p.status === 'approved' && (
                      <button onClick={() => processPayout(p.id, 'paid')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                        Marquer versé
                      </button>
                    )}
                    {['pending', 'approved'].includes(p.status) && (
                      <button onClick={() => processPayout(p.id, 'reject')} className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50">
                        Rejeter
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
