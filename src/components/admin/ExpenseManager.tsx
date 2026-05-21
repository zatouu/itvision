'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, Filter, Trash2, Edit3, X, Check, Calendar,
  Building2, CreditCard, AlertTriangle, CheckCircle2, FileText,
  TrendingDown, Wallet, Tag, Briefcase, Save, RefreshCw
} from 'lucide-react'

const CATEGORIES = [
  { value: 'achat_materiel', label: 'Achat matériel' },
  { value: 'sous_traitance', label: 'Sous-traitance' },
  { value: 'transport', label: 'Transport' },
  { value: 'salaire', label: 'Salaires' },
  { value: 'loyer', label: 'Loyer' },
  { value: 'services', label: 'Services' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'commissions', label: 'Commissions' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'douane', label: 'Douane' },
  { value: 'autre', label: 'Autre' }
]

const PAYMENT_METHODS = [
  { value: '', label: '—' },
  { value: 'virement', label: 'Virement' },
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'carte', label: 'Carte' },
  { value: 'autre', label: 'Autre' }
]

interface Expense {
  _id: string
  numero: string
  label: string
  description?: string
  category: string
  projectId?: string
  projectName?: string
  supplier?: { name?: string; email?: string; phone?: string }
  amountHT: number
  taxRate: number
  taxAmount: number
  amountTTC: number
  currency: string
  brsApplicable: boolean
  brsRate: number
  brsThreshold: number
  brsAmount: number
  netPayable: number
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'cancelled'
  paymentMethod?: string
  paidAmount: number
  paidAt?: string
  dueDate?: string
  expenseDate: string
  isBillable: boolean
  notes?: string
}

interface ProjectOption { _id: string; name: string }

const fmt = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} FCFA`
const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyExpense: Partial<Expense> = {
  label: '',
  category: 'achat_materiel',
  amountHT: 0,
  taxRate: 0,
  taxAmount: 0,
  amountTTC: 0,
  brsApplicable: false,
  brsRate: 5,
  brsThreshold: 25000,
  brsAmount: 0,
  netPayable: 0,
  paymentStatus: 'unpaid',
  paidAmount: 0,
  expenseDate: todayISO(),
  isBillable: false,
  supplier: { name: '' }
}

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Partial<Expense>>(emptyExpense)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const [expRes, prjRes] = await Promise.all([
        fetch('/api/admin/expenses', { credentials: 'include' }),
        fetch('/api/projects?limit=200', { credentials: 'include' })
      ])
      if (expRes.ok) {
        const j = await expRes.json()
        setExpenses(j.expenses || [])
      }
      if (prjRes.ok) {
        const j = await prjRes.json()
        const list = (j.projects || []).map((p: any) => ({ _id: String(p._id || p.id), name: p.name }))
        setProjects(list)
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory && e.category !== filterCategory) return false
      if (filterStatus && e.paymentStatus !== filterStatus) return false
      if (filterProject && String(e.projectId) !== filterProject) return false
      if (search) {
        const q = search.toLowerCase()
        const blob = `${e.numero} ${e.label} ${e.supplier?.name || ''} ${e.projectName || ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [expenses, search, filterCategory, filterStatus, filterProject])

  const totals = useMemo(() => {
    let total = 0, paid = 0, unpaid = 0, brsTotal = 0
    for (const e of filtered) {
      if (e.paymentStatus === 'cancelled') continue
      const net = Number(e.netPayable ?? e.amountTTC) || 0
      total += Number(e.amountTTC) || 0
      paid += Number(e.paidAmount) || 0
      brsTotal += Number(e.brsAmount) || 0
      if (e.paymentStatus !== 'paid') {
        unpaid += Math.max(0, net - (Number(e.paidAmount) || 0))
      }
    }
    return { total, paid, unpaid, brsTotal, count: filtered.length }
  }, [filtered])

  const BRS_CATEGORIES = new Set(['sous_traitance', 'services', 'commissions', 'salaire'])

  const updateAmounts = (next: Partial<Expense>) => {
    const ht = Number(next.amountHT || 0)
    const rate = Number(next.taxRate || 0)
    const taxAmount = Math.round(ht * rate) / 100
    const ttc = ht + taxAmount

    // Auto-détection BRS selon la catégorie
    const autoBrs = next.category ? BRS_CATEGORIES.has(next.category) : false
    const brsApplicable = next.brsApplicable !== undefined ? next.brsApplicable : autoBrs
    const brsRate = Number(next.brsRate ?? 5)
    const brsThreshold = Number(next.brsThreshold ?? 25000)
    const brsAmount = brsApplicable && ht > brsThreshold ? Math.round(ht * brsRate) / 100 : 0
    const netPayable = ttc - brsAmount

    return { ...next, taxAmount, amountTTC: ttc, brsApplicable, brsRate, brsThreshold, brsAmount, netPayable }
  }

  const openCreate = () => {
    setEditing({ ...emptyExpense, expenseDate: todayISO() })
    setShowModal(true)
    setError(null)
  }

  const openEdit = (e: Expense) => {
    setEditing({
      ...e,
      expenseDate: e.expenseDate?.slice(0, 10),
      dueDate: e.dueDate?.slice(0, 10),
      paidAt: e.paidAt?.slice(0, 10)
    })
    setShowModal(true)
    setError(null)
  }

  const save = async () => {
    if (!editing.label?.trim()) { setError('Libellé requis'); return }
    if (!Number.isFinite(Number(editing.amountHT)) || Number(editing.amountHT) < 0) {
      setError('Montant invalide'); return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing)
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Erreur enregistrement')
      setShowModal(false)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return
    const res = await fetch(`/api/admin/expenses?id=${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) await load()
  }

  const togglePaid = async (e: Expense) => {
    const newStatus = e.paymentStatus === 'paid' ? 'unpaid' : 'paid'
    const body: any = { id: e._id, paymentStatus: newStatus }
    if (newStatus === 'paid') {
      body.paidAt = new Date().toISOString()
      body.paidAmount = e.netPayable ?? e.amountTTC
    } else {
      body.paidAmount = 0
      body.paidAt = null
    }
    const res = await fetch('/api/admin/expenses', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (res.ok) await load()
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      unpaid: 'bg-orange-100 text-orange-700',
      partial: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-gray-100 text-gray-500'
    }
    const labels: Record<string, string> = { unpaid: 'À payer', partial: 'Partiel', paid: 'Payée', cancelled: 'Annulée' }
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[s] || ''}`}>{labels[s] || s}</span>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-orange-600" />
              Gestion des dépenses
            </h1>
            <p className="text-sm text-gray-500 mt-1">Suivi des sorties d'argent par projet et catégorie</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Nouvelle dépense
            </button>
          </div>
        </div>

        {/* Totaux */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500">Nombre</p>
            <p className="text-xl font-bold text-gray-900">{totals.count}</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
            <p className="text-xs text-gray-500">Total dépenses</p>
            <p className="text-xl font-bold text-orange-700">{fmt(totals.total)}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-gray-500">Payé (net)</p>
            <p className="text-xl font-bold text-emerald-700">{fmt(totals.paid)}</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-xs text-gray-500">Reste à payer</p>
            <p className="text-xl font-bold text-red-700">{fmt(totals.unpaid)}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-gray-500">BRS retenu</p>
            <p className="text-xl font-bold text-blue-700">{fmt(totals.brsTotal)}</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="">Tous statuts</option>
            <option value="unpaid">À payer</option>
            <option value="partial">Partiel</option>
            <option value="paid">Payée</option>
            <option value="cancelled">Annulée</option>
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value="">Tous projets</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune dépense trouvée</p>
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100">
              <Plus className="h-4 w-4" /> Créer une dépense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">N°</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Libellé</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Catégorie</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Projet</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Montant TTC</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => {
                  const isOverdue = e.paymentStatus !== 'paid' && e.dueDate && new Date(e.dueDate) < new Date()
                  return (
                    <tr key={e._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.numero}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{e.label}</p>
                        {e.supplier?.name && <p className="text-xs text-gray-500">{e.supplier.name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium">
                          <Tag className="h-3 w-3" />
                          {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.projectName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(e.expenseDate).toLocaleDateString('fr-FR')}
                        {isOverdue && (
                          <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Échéance dépassée
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(e.amountTTC)}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(e.paymentStatus)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => togglePaid(e)}
                            title={e.paymentStatus === 'paid' ? 'Marquer impayée' : 'Marquer payée'}
                            className={`p-1.5 rounded-lg ${e.paymentStatus === 'paid' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(e)} className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(e._id)} className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editing._id ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Libellé *">
                  <input
                    value={editing.label || ''}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    className="input"
                    placeholder="Ex: Achat câbles Cat6"
                  />
                </Field>
                <Field label="Catégorie *">
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="input"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Projet associé">
                  <select
                    value={editing.projectId || ''}
                    onChange={(e) => {
                      const p = projects.find(pr => pr._id === e.target.value)
                      setEditing({ ...editing, projectId: e.target.value || undefined, projectName: p?.name })
                    }}
                    className="input"
                  >
                    <option value="">— Aucun (frais généraux)</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Fournisseur">
                  <input
                    value={editing.supplier?.name || ''}
                    onChange={(e) => setEditing({ ...editing, supplier: { ...editing.supplier, name: e.target.value } })}
                    className="input"
                    placeholder="Nom du fournisseur"
                  />
                </Field>
                <Field label="Date dépense *">
                  <input
                    type="date"
                    value={editing.expenseDate || ''}
                    onChange={(e) => setEditing({ ...editing, expenseDate: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Échéance">
                  <input
                    type="date"
                    value={editing.dueDate || ''}
                    onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Montant HT">
                  <input
                    type="number"
                    value={editing.amountHT ?? 0}
                    onChange={(e) => setEditing(updateAmounts({ ...editing, amountHT: Number(e.target.value) }))}
                    className="input"
                  />
                </Field>
                <Field label="TVA (%)">
                  <input
                    type="number"
                    value={editing.taxRate ?? 0}
                    onChange={(e) => setEditing(updateAmounts({ ...editing, taxRate: Number(e.target.value) }))}
                    className="input"
                  />
                </Field>
                <Field label="Total TTC">
                  <input
                    type="number"
                    value={editing.amountTTC ?? 0}
                    onChange={(e) => setEditing({ ...editing, amountTTC: Number(e.target.value) })}
                    className="input font-bold"
                  />
                </Field>
              </div>

              {/* BRS */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-900">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.brsApplicable)}
                    onChange={(e) => setEditing(updateAmounts({ ...editing, brsApplicable: e.target.checked }))}
                    className="rounded"
                  />
                  Sujette à retenue BRS (main d'oeuvre / services)
                </label>
                {editing.brsApplicable && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Field label="Taux BRS (%)">
                      <input
                        type="number"
                        value={editing.brsRate ?? 5}
                        onChange={(e) => setEditing(updateAmounts({ ...editing, brsRate: Number(e.target.value) }))}
                        className="input"
                      />
                    </Field>
                    <Field label="Seuil BRS (FCFA)">
                      <input
                        type="number"
                        value={editing.brsThreshold ?? 25000}
                        onChange={(e) => setEditing(updateAmounts({ ...editing, brsThreshold: Number(e.target.value) }))}
                        className="input"
                      />
                    </Field>
                    <div className="p-2 rounded-lg bg-white border border-blue-100">
                      <p className="text-[11px] text-blue-600 font-semibold">Retenue BRS</p>
                      <p className="text-lg font-bold text-blue-800">{fmt(Number(editing.brsAmount) || 0)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <p className="text-[11px] text-emerald-600 font-semibold">Net à payer</p>
                      <p className="text-lg font-bold text-emerald-800">{fmt(Number(editing.netPayable) || 0)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Statut paiement">
                  <select
                    value={editing.paymentStatus}
                    onChange={(e) => setEditing({ ...editing, paymentStatus: e.target.value as any })}
                    className="input"
                  >
                    <option value="unpaid">À payer</option>
                    <option value="partial">Partiel</option>
                    <option value="paid">Payée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </Field>
                <Field label="Mode paiement">
                  <select
                    value={editing.paymentMethod || ''}
                    onChange={(e) => setEditing({ ...editing, paymentMethod: e.target.value })}
                    className="input"
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="Montant payé">
                  <input
                    type="number"
                    value={editing.paidAmount ?? 0}
                    onChange={(e) => setEditing({ ...editing, paidAmount: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Description, référence facture, etc."
                />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editing.isBillable)}
                  onChange={(e) => setEditing({ ...editing, isBillable: e.target.checked })}
                  className="rounded"
                />
                Refacturable au client
              </label>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl">
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          outline: none;
          transition: all 0.15s;
        }
        .input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
