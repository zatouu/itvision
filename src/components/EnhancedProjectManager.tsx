'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, Pencil, RefreshCw, Save, X, Users, Calendar, CheckCircle, AlertCircle, Clock, Zap, UserPlus, Search } from 'lucide-react'

type Project = {
  _id?: string
  name: string
  description?: string
  address: string
  clientId: string | { _id: string; name: string }
  status?: 'lead' | 'quoted' | 'approved' | 'in_progress' | 'testing' | 'completed' | 'on_hold'
  startDate: string
  endDate?: string
  serviceType?: string
  value?: number
  margin?: number
  progress?: number
  assignedTo?: string[]
}

type Client = { id: string; name: string; email?: string; phone?: string }
type Service = { _id: string; name: string; code: string }
type Quote = { _id: string; clientId: any; serviceCode: string; totalTTC: number; status: string }
type Technician = { _id: string; name: string; email: string; specialties: string[]; isAvailable: boolean }

export default function EnhancedProjectManager() {
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Project | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [newProjectId, setNewProjectId] = useState<string | null>(null)
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const editProjectId = useMemo(() => searchParams?.get('editProject') || null, [searchParams])

  const refresh = async () => {
    setLoading(true)
    try {
      const [pRes, cRes, sRes, qRes, tRes] = await Promise.all([
        fetch('/api/projects?status=all&limit=100', { credentials: 'include' }),
        fetch('/api/admin/clients?limit=200', { credentials: 'include' }),
        fetch('/api/services', { credentials: 'include' }),
        fetch('/api/quotes?status=approved', { credentials: 'include' }),
        fetch('/api/technicians?limit=100', { credentials: 'include' })
      ])
      if (pRes.ok) {
        const j = await pRes.json()
        setItems(j.projects || [])
      }
      if (cRes.ok) {
        const j = await cRes.json()
        setClients((j.clients || []).map((c: any) => ({ id: c.id || c._id, name: c.name || c.company || c.username || 'Client', email: c.email, phone: c.phone })))
      }
      if (sRes.ok) {
        const j = await sRes.json()
        setServices(j.items || [])
      }
      if (qRes.ok) {
        const j = await qRes.json()
        setQuotes(j.items || [])
      }
      if (tRes.ok) {
        const j = await tRes.json()
        setTechnicians(j.technicians || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!editProjectId || items.length === 0) return
    const projectToEdit = items.find(p => String(p._id) === editProjectId)
    if (projectToEdit) {
      setEditing({ ...projectToEdit })
      setSelectedQuoteId('')
      setShowAssignModal(false)
      setShowNewClient(false)
    }
  }, [editProjectId, items])

  const clearEditProjectParam = () => {
    if (!editProjectId) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('editProject')
    const next = params.size ? `${pathname}?${params.toString()}` : pathname
    router.replace(next, { scroll: false })
  }

  useEffect(() => {
    if (selectedQuoteId && quotes.length > 0) {
      const q = quotes.find(q => q._id === selectedQuoteId)
      if (q) {
        const clientId = typeof q.clientId === 'object' ? q.clientId._id : q.clientId
        setEditing({
          name: `Projet depuis devis ${q._id}`,
          address: '',
          clientId: String(clientId),
          startDate: new Date().toISOString().slice(0,10),
          status: 'approved',
          serviceType: q.serviceCode.toLowerCase(),
          value: q.totalTTC,
          margin: 0,
          progress: 0
        })
      }
    }
  }, [selectedQuoteId, quotes])

  const createClient = async () => {
    if (!newClient.name || !newClient.email) return alert('Nom et email requis')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClient.name,
          username: newClient.email.split('@')[0],
          email: newClient.email,
          phone: newClient.phone,
          role: 'CLIENT',
          password: 'TempPass123!'
        })
      })
      if (res.ok) {
        const j = await res.json()
        const created = { id: j.user.id, name: newClient.name, email: newClient.email, phone: newClient.phone }
        setClients([...clients, created])
        if (editing) setEditing({ ...editing, clientId: created.id })
        setShowNewClient(false)
        setNewClient({ name: '', email: '', phone: '' })
        alert('Client créé')
      }
    } catch {
      alert('Erreur création client')
    }
  }

  const onSave = async () => {
    if (!editing || !editing.name || !editing.address || !editing.clientId) {
      return alert('Nom, adresse et client requis')
    }
    try {
      const method = editing._id ? 'PUT' : 'POST'
      const body = editing._id ? { id: editing._id, ...editing } : editing
      const res = await fetch('/api/projects', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) return alert('Erreur sauvegarde projet')
      const j = await res.json()
      const createdId = j.project?._id || editing._id
      await refresh()
      setEditing(null)
      clearEditProjectParam()
      if (!editing._id && createdId) {
        setNewProjectId(String(createdId))
        setShowAssignModal(true)
      } else {
        alert(editing._id ? 'Projet modifié' : 'Projet créé')
      }
    } catch {
      alert('Erreur sauvegarde projet')
    }
  }

  const assignTechnicians = async () => {
    if (!newProjectId || selectedTechnicians.length === 0) return
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newProjectId, assignedTo: selectedTechnicians })
      })
      if (!res.ok) return alert('Erreur affectation')
      // Créer interventions
      for (const techId of selectedTechnicians) {
        await fetch('/api/interventions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: items.find(p => String(p._id) === newProjectId)?.name || 'Intervention',
            client: { name: '', address: '', zone: '' },
            service: items.find(p => String(p._id) === newProjectId)?.serviceType || '',
            projectId: newProjectId,
            assignedTechnician: techId,
            priority: 'medium',
            estimatedDuration: 4,
            requiredSkills: [],
            status: 'scheduled'
          })
        })
      }
      alert(`${selectedTechnicians.length} technicien(s) affecté(s)`)
      setShowAssignModal(false)
      setNewProjectId(null)
      setSelectedTechnicians([])
      await refresh()
    } catch {
      alert('Erreur affectation techniciens')
    }
  }

  const autoAssign = () => {
    if (!editing?.serviceType || technicians.length === 0) return
    const service = editing.serviceType
    const available = technicians.filter(t => t.isAvailable && t.specialties?.some(s => s.toLowerCase().includes(service.toLowerCase())))
    setSelectedTechnicians(available.slice(0, 3).map(t => String(t._id)))
  }

  const getStatusColor = (s?: string) => {
    switch (s) {
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-200'
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-orange-100 text-orange-800 border-orange-200'
    }
  }

  const getStatusIcon = (s?: string) => {
    switch (s) {
      case 'in_progress': return <CheckCircle className="h-4 w-4" />
      case 'approved': return <Clock className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const filteredClients = clients.filter(c => 
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Projets</h2>
          <p className="text-gray-600">Workflow complet : création, affectation et suivi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { clearEditProjectParam(); setEditing({ name: '', address: '', clientId: '', startDate: new Date().toISOString().slice(0,10), status: 'lead', progress: 0 }); setSelectedQuoteId('') }} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm">
            <Plus className="h-4 w-4" /> Nouveau projet
          </button>
          <button onClick={refresh} className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold">{items.length}</div>
        </div>
        <div className="bg-green-50 border-green-200 border rounded-lg p-4">
          <div className="text-sm text-green-600">En cours</div>
          <div className="text-2xl font-bold text-green-700">{items.filter(p => p.status === 'in_progress').length}</div>
        </div>
        <div className="bg-blue-50 border-blue-200 border rounded-lg p-4">
          <div className="text-sm text-blue-600">Validés</div>
          <div className="text-2xl font-bold text-blue-700">{items.filter(p => p.status === 'approved').length}</div>
        </div>
        <div className="bg-gray-50 border-gray-200 border rounded-lg p-4">
          <div className="text-sm text-gray-600">Terminés</div>
          <div className="text-2xl font-bold text-gray-700">{items.filter(p => p.status === 'completed').length}</div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Service</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Progression</th>
              <th className="text-left p-3">Valeur</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Aucun projet</td></tr>
            ) : (
              items.map(p => {
                const assignedCount = Array.isArray(p.assignedTo) ? p.assignedTo.length : 0
                const client = typeof p.clientId === 'object' ? p.clientId.name : clients.find(c => c.id === p.clientId)?.name || p.clientId
                return (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{p.name}</td>
                    <td className="p-3 text-gray-600">{String(client)}</td>
                    <td className="p-3 text-gray-600">{p.serviceType || '-'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>
                        {getStatusIcon(p.status)}
                        {p.status === 'in_progress' ? '🟢 En cours' : p.status === 'approved' ? '🟠 Validé' : p.status === 'completed' ? '🔴 Terminé' : 'En attente'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${p.progress || 0}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-900">{p.value ? `${(p.value).toLocaleString('fr-FR')} FCFA` : '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {assignedCount > 0 && (
                          <span className="text-xs text-gray-500">{assignedCount} tech.</span>
                        )}
                        <button className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs" onClick={() => setEditing({ ...p })}>
                          <Pencil className="h-3 w-3" /> Modifier
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setEditing(null); setSelectedQuoteId(''); clearEditProjectParam() }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">{editing._id ? 'Modifier' : 'Nouveau'} projet</h3>
            </div>
            <div className="p-6 space-y-4">
              {!editing._id && (
                <div>
                  <label className="block text-sm font-medium mb-2">Créer depuis devis validé</label>
                  <select value={selectedQuoteId} onChange={e => setSelectedQuoteId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    <option value="">Nouveau projet (manuel)</option>
                    {quotes.map(q => (
                      <option key={q._id} value={q._id}>Devis {q._id} - {q.serviceCode} - {q.totalTTC?.toLocaleString('fr-FR')} FCFA</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nom du projet *</label>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="Nom" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Adresse *</label>
                  <input className="w-full border rounded-lg px-3 py-2" placeholder="Adresse complète" value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Client *</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="Rechercher un client..."
                      className="w-full border rounded-lg pl-8 pr-8 py-2 text-sm"
                    />
                    <button onClick={() => setShowNewClient(true)} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700" title="Nouveau client">
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                  <select value={String(editing.clientId)} onChange={e => setEditing({ ...editing, clientId: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">
                    <option value="">Sélectionner</option>
                    {filteredClients.slice(0, 10).map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.email && `(${c.email})`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type de projet *</label>
                  <select value={editing.serviceType || ''} onChange={e => setEditing({ ...editing, serviceType: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                    <option value="">Sélectionner</option>
                    {services.map(s => (
                      <option key={s._id} value={s.code.toLowerCase()}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select value={editing.status || 'lead'} onChange={e => setEditing({ ...editing, status: e.target.value as any })} className="w-full border rounded-lg px-3 py-2">
                    <option value="lead">Prospect</option>
                    <option value="approved">Validé</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="on_hold">En pause</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Progression (%)</label>
                  <input type="number" min="0" max="100" value={editing.progress || 0} onChange={e => setEditing({ ...editing, progress: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date début *</label>
                  <input type="date" value={editing.startDate?.slice(0,10) || ''} onChange={e => setEditing({ ...editing, startDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date fin</label>
                  <input type="date" value={editing.endDate?.slice(0,10) || ''} onChange={e => setEditing({ ...editing, endDate: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Budget estimé (FCFA)</label>
                  <input type="number" value={editing.value ?? ''} onChange={e => setEditing({ ...editing, value: e.target.value ? Number(e.target.value) : undefined })} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Marge (%)</label>
                  <input type="number" value={editing.margin ?? ''} onChange={e => setEditing({ ...editing, margin: e.target.value ? Number(e.target.value) : undefined })} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3}></textarea>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => { setEditing(null); setSelectedQuoteId(''); clearEditProjectParam() }}>
                <X className="h-4 w-4 inline mr-1" /> Annuler
              </button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={onSave}>
                <Save className="h-4 w-4 inline mr-1" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewClient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewClient(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Nouveau client</h3>
            </div>
            <div className="p-6 space-y-4">
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Nom complet *" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
              <input type="email" className="w-full border rounded-lg px-3 py-2" placeholder="Email *" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
              <input type="tel" className="w-full border rounded-lg px-3 py-2" placeholder="Téléphone" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setShowNewClient(false)}>Annuler</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={createClient}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && newProjectId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Affecter des techniciens</h3>
              <p className="text-sm text-gray-600">Choisissez les techniciens pour ce projet</p>
            </div>
            <div className="p-6">
              <div className="mb-4 flex justify-between">
                <span className="text-sm text-gray-600">{selectedTechnicians.length} sélectionné(s)</span>
                <button onClick={autoAssign} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                  <Zap className="h-3 w-3" /> Affectation automatique
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {technicians.filter(t => {
                  if (!editing?.serviceType) return true
                  return t.specialties?.some(s => s.toLowerCase().includes(editing.serviceType!.toLowerCase()))
                }).map(t => (
                  <label key={t._id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedTechnicians.includes(String(t._id))} onChange={e => {
                      if (e.target.checked) {
                        setSelectedTechnicians([...selectedTechnicians, String(t._id)])
                      } else {
                        setSelectedTechnicians(selectedTechnicians.filter(id => id !== String(t._id)))
                      }
                    }} />
                    <div className="flex-1">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-sm text-gray-600">{t.email}</div>
                      <div className="text-xs text-gray-500 mt-1">{t.specialties?.join(', ') || 'Aucune spécialité'}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${t.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.isAvailable ? 'Disponible' : 'Indisponible'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setShowAssignModal(false)}>Annuler</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={assignTechnicians} disabled={selectedTechnicians.length === 0}>
                Affecter {selectedTechnicians.length} technicien(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

