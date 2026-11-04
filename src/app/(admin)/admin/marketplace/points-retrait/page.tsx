'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapPin, Loader2, Plus } from 'lucide-react'

type Point = {
  id: string
  name: string
  neighborhood: string
  city: string
  address: string
  landmark?: string
  phone?: string
  hours?: string
  mapsUrl?: string
  active: boolean
  sortOrder?: number
}

const EMPTY = { name: '', neighborhood: '', city: 'Dakar', address: '', landmark: '', phone: '', hours: '', mapsUrl: '' }

export default function AdminPickupPointsPage() {
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/admin/market/pickup-points').then(r => r.json())
      if (!d.success) throw new Error(d.error)
      setPoints(d.points || [])
    } catch {
      setNotice({ ok: false, text: 'Chargement impossible' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const send = async (method: 'POST' | 'PATCH' | 'DELETE', body?: object, query = '') => {
    const res = await fetch(`/api/admin/market/pickup-points${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d.success) throw new Error(d.error || 'Erreur')
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setNotice(null)
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v !== '' || k === 'mapsUrl'))
      await send(editing ? 'PATCH' : 'POST', editing ? { id: editing, ...payload } : payload)
      setNotice({ ok: true, text: editing ? 'Point mis à jour' : 'Point de retrait ajouté' })
      setForm(EMPTY); setEditing(null)
      await load()
    } catch (err: any) {
      setNotice({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (p: Point) => {
    try {
      await send('PATCH', { id: p.id, active: !p.active })
      await load()
    } catch (err: any) {
      setNotice({ ok: false, text: err.message })
    }
  }

  const input = (key: keyof typeof EMPTY, label: string, placeholder = '', required = false) => (
    <label className="block">
      <span className="text-xs font-semibold text-stone-600">{label}{required ? ' *' : ''}</span>
      <input
        required={required}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
    </label>
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><MapPin className="h-6 w-6 text-emerald-600" /> Points de retrait</h1>
        <p className="text-sm text-stone-600">Proposés au paiement des commandes importées et à l&apos;inscription aux achats groupés. Retrait gratuit pour le client.</p>
      </div>

      {notice && (
        <div className={`rounded-xl border p-3 text-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.text}</div>
      )}

      <form onSubmit={save} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:grid-cols-2">
        {input('name', 'Nom du point', 'Boutique Sacré-Cœur 3', true)}
        {input('neighborhood', 'Quartier', 'Sacré-Cœur', true)}
        {input('address', 'Adresse', 'Rue 10, villa 45', true)}
        {input('landmark', 'Repère', 'En face de la pharmacie')}
        {input('city', 'Ville', 'Dakar', true)}
        {input('hours', 'Horaires', 'Lun-Sam 9h-19h')}
        {input('phone', 'Téléphone du point', '77 000 00 00')}
        {input('mapsUrl', 'Lien Google Maps', 'https://maps.app.goo.gl/…')}
        <div className="flex gap-2 md:col-span-2">
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {editing ? 'Enregistrer' : 'Ajouter'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm(EMPTY) }} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Annuler</button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {points.length === 0 && <p className="text-sm text-stone-500">Aucun point pour l&apos;instant.</p>}
          {points.map(p => (
            <div key={p.id} className={`rounded-2xl border p-4 ${p.active ? 'border-stone-200 bg-white' : 'border-stone-200 bg-stone-50 opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-900">{p.name}</p>
                  <p className="text-sm text-stone-600">{p.neighborhood}, {p.city}</p>
                  <p className="text-xs text-stone-500">{p.address}{p.landmark ? ` · ${p.landmark}` : ''}</p>
                  {(p.hours || p.phone) && <p className="text-xs text-stone-500">{[p.hours, p.phone].filter(Boolean).join(' · ')}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>{p.active ? 'Actif' : 'Inactif'}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setEditing(p.id)
                    setForm({ name: p.name, neighborhood: p.neighborhood, city: p.city, address: p.address, landmark: p.landmark || '', phone: p.phone || '', hours: p.hours || '', mapsUrl: p.mapsUrl || '' })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold"
                >
                  Modifier
                </button>
                <button onClick={() => toggle(p)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold">
                  {p.active ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
