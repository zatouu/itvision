'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Plus, Search, Trash2, Edit2, Upload, Download, Mail,
  Building2, Phone, Globe, MapPin, X, CheckCircle, AlertCircle, Loader2
} from 'lucide-react'

interface Lead {
  _id: string
  companyName: string
  contactName?: string
  email: string
  phone?: string
  website?: string
  sector: string
  city?: string
  status: string
  notes?: string
  createdAt: string
  lastContactedAt?: string
}

const SECTORS: Record<string, string> = {
  immobilier: 'Immobilier',
  banque_finance: 'Banque & Finance',
  commerce_detail: 'Commerce de détail',
  hotellerie: 'Hôtellerie',
  sante: 'Santé',
  education: 'Éducation',
  industrie: 'Industrie',
  logistique: 'Logistique',
  administration: 'Administration',
  btp: 'BTP',
  restauration: 'Restauration',
  autre: 'Autre',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  interested: 'bg-emerald-100 text-emerald-800',
  not_interested: 'bg-red-100 text-red-700',
  converted: 'bg-emerald-100 text-emerald-700',
  bounced: 'bg-stone-100 text-stone-500',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  interested: 'Intéressé',
  not_interested: 'Pas intéressé',
  converted: 'Converti',
  bounced: 'Rebondi',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; bySector: Record<string, number> } | null>(null)

  const limit = 50

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (search) params.set('search', search)
      if (sectorFilter) params.set('sector', sectorFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/admin/leads?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setLeads(data.leads || [])
        setTotal(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, sectorFilter, statusFilter])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/leads/import')
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch {}
  }

  useEffect(() => { fetchLeads() }, [fetchLeads])
  useEffect(() => { fetchStats() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce lead ?')) return
    try {
      await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' })
      fetchLeads()
      fetchStats()
    } catch {}
  }

  const handleSave = async (lead: Partial<Lead>) => {
    try {
      if (editingLead) {
        await fetch('/api/admin/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingLead._id, ...lead }),
        })
      } else {
        await fetch('/api/admin/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        })
      }
      setShowAddModal(false)
      setEditingLead(null)
      fetchLeads()
      fetchStats()
    } catch (err) {
      alert('Erreur lors de la sauvegarde')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Prospects B2B</h1>
            <p className="text-sm text-stone-500">
              Gérez vos prospects entreprise et envoyez-leur des campagnes email ciblées.
            </p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-stone-500">Total prospects</p>
              <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-stone-500">Nouveaux</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byStatus?.new || 0}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-stone-500">Contactés</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.byStatus?.contacted || 0}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-stone-500">Convertis</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.byStatus?.converted || 0}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={sectorFilter}
              onChange={e => { setSectorFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
            >
              <option value="">Tous secteurs</option>
              {Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
            >
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm text-stone-700"
            >
              <Upload className="w-4 h-4" /> Importer
            </button>
            <button
              onClick={() => { setEditingLead(null); setShowAddModal(true) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-700 font-medium">
              <tr>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Secteur</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Chargement...
                </td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                  Aucun prospect. Cliquez sur "Ajouter" ou "Importer" pour commencer.
                </td></tr>
              ) : leads.map(lead => (
                <tr key={lead._id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-stone-900">{lead.companyName}</p>
                        {lead.website && <p className="text-xs text-stone-400">{lead.website}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-stone-700">{lead.contactName || '-'}</p>
                    <p className="text-xs text-stone-400">{lead.email}</p>
                    {lead.phone && <p className="text-xs text-stone-400">{lead.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{SECTORS[lead.sector] || lead.sector}</td>
                  <td className="px-4 py-3 text-stone-600">{lead.city || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-stone-100 text-stone-600'}`}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingLead(lead); setShowAddModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-stone-200 flex items-center justify-between">
            <p className="text-sm text-stone-500">{total} prospect(s) — Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 text-sm"
              >Précédent</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 text-sm"
              >Suivant</button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <LeadModal
          lead={editingLead}
          onClose={() => { setShowAddModal(false); setEditingLead(null) }}
          onSave={handleSave}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { fetchLeads(); fetchStats() }}
        />
      )}
    </div>
  )
}

function LeadModal({ lead, onClose, onSave }: { lead: Lead | null; onClose: () => void; onSave: (lead: Partial<Lead>) => void }) {
  const [form, setForm] = useState({
    companyName: lead?.companyName || '',
    contactName: lead?.contactName || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    website: lead?.website || '',
    sector: lead?.sector || 'autre',
    city: lead?.city || '',
    notes: lead?.notes || '',
    status: lead?.status || 'new',
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">{lead ? 'Modifier le prospect' : 'Nouveau prospect'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-stone-700">Entreprise *</label>
              <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Contact</label>
              <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Téléphone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Secteur</label>
              <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1">
                {Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Ville</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Site web</label>
              <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Statut</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
          </div>
        </div>
        <div className="p-5 border-t border-stone-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm">Annuler</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            {lead ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  const handleImport = async () => {
    if (!csvText.trim()) return
    setImporting(true)
    try {
      const lines = csvText.trim().split('\n')
      const leads: Array<Record<string, string>> = []
      for (const line of lines) {
        const parts = line.split(',').map(s => s.trim())
        if (parts.length < 2) continue
        leads.push({
          companyName: parts[0],
          email: parts[1],
          contactName: parts[2] || '',
          phone: parts[3] || '',
          sector: parts[4] || 'autre',
          city: parts[5] || '',
        })
      }
      const res = await fetch('/api/admin/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ created: data.created, skipped: data.skipped })
        onImported()
      }
    } catch {
      alert('Erreur lors de l\'import')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Importer des prospects</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {result ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium text-stone-900">{result.created} prospect(s) importé(s)</p>
              {result.skipped > 0 && <p className="text-sm text-stone-500">{result.skipped} ignoré(s) (doublons ou incomplets)</p>}
              <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Fermer</button>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">Format CSV (une ligne par prospect) :</p>
                <p className="font-mono text-xs">entreprise,email,contact,téléphone,secteur,ville</p>
                <p className="text-xs mt-1">Secteurs: {Object.keys(SECTORS).join(', ')}</p>
              </div>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                rows={8}
                placeholder="Ex: BICIS,contact@bicis.sn,Ahamed Diop,771234567,banque_finance,Dakar"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono"
              />
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm">Annuler</button>
                <button
                  onClick={handleImport}
                  disabled={importing || !csvText.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Importer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
