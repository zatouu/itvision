'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, RefreshCw, Save, X } from 'lucide-react'

type Project = {
  _id?: string
  name: string
  description?: string
  address: string
  clientId: string
  status?: string
  startDate: string
  endDate?: string
  serviceType?: string
  value?: number
  margin?: number
}

export default function ProjectManagerPanel() {
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Project | null>(null)
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects?status=all&limit=50', { credentials: 'include' })
      const json = await res.json()
      setItems(json.projects || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/clients?limit=100', { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          setClients((json.clients || []).map((c: any) => ({ id: c.id || c._id, name: c.name || c.company || c.username || 'Client' })))
        }
      } catch {}
    })()
  }, [])

  const onSave = async () => {
    if (!editing) return
    const method = editing._id ? 'PUT' : 'POST'
    const body = editing._id ? { id: editing._id, ...editing } : editing
    const res = await fetch('/api/projects', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) return alert('Erreur lors de la sauvegarde du projet')
    setEditing(null)
    await refresh()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Projets</h2>
        <div className="flex gap-2">
          <button onClick={() => setEditing({ name: '', address: '', clientId: '', startDate: new Date().toISOString().slice(0,10) })} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm">
            <Plus className="h-4 w-4" /> Nouveau projet
          </button>
          <button onClick={refresh} className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Début</th>
              <th className="text-left p-3">Valeur</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Aucun projet</td></tr>
            ) : (
              items.map(p => (
                <tr key={p._id} className="border-t">
                  <td className="p-3 font-medium text-gray-900">{p.name}</td>
                  <td className="p-3 text-gray-600">{p.clientId?.name || p.clientId}</td>
                  <td className="p-3 text-gray-600">{String((p as any).status || '').toUpperCase()}</td>
                  <td className="p-3 text-gray-600">{p.startDate ? new Date(p.startDate).toLocaleDateString('fr-FR') : '-'}</td>
                  <td className="p-3 text-gray-900">{p.value ? p.value.toLocaleString?.() : '-'}</td>
                  <td className="p-3 text-right">
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded border" onClick={() => setEditing({ ...p })}><Pencil className="h-4 w-4" /> Éditer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editing._id ? 'Modifier' : 'Nouveau'} projet</h3>
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 col-span-2" placeholder="Nom" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 col-span-2" placeholder="Adresse" value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })} />
              <select className="border rounded-lg px-3 py-2" value={editing.clientId} onChange={e => setEditing({ ...editing, clientId: e.target.value })}>
                <option value="">Client</option>
                {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <select className="border rounded-lg px-3 py-2" value={editing.status || 'lead'} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                <option value="lead">Prospect</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="on_hold">En pause</option>
              </select>
              <input type="date" className="border rounded-lg px-3 py-2" value={editing.startDate?.slice(0,10) || ''} onChange={e => setEditing({ ...editing, startDate: e.target.value })} />
              <input type="date" className="border rounded-lg px-3 py-2" value={editing.endDate?.slice(0,10) || ''} onChange={e => setEditing({ ...editing, endDate: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" placeholder="Service (ex: videosurveillance)" value={editing.serviceType || ''} onChange={e => setEditing({ ...editing, serviceType: e.target.value })} />
              <input type="number" className="border rounded-lg px-3 py-2" placeholder="Valeur (FCFA)" value={editing.value ?? ''} onChange={e => setEditing({ ...editing, value: e.target.value ? Number(e.target.value) : undefined })} />
              <input type="number" className="border rounded-lg px-3 py-2" placeholder="Marge (%)" value={editing.margin ?? ''} onChange={e => setEditing({ ...editing, margin: e.target.value ? Number(e.target.value) : undefined })} />
              <textarea className="border rounded-lg px-3 py-2 col-span-2" placeholder="Description" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setEditing(null)}><X className="h-4 w-4 inline mr-1" /> Annuler</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={onSave}><Save className="h-4 w-4 inline mr-1" /> Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


