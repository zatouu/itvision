'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Scale, AlertCircle, CheckCircle2, RefreshCw, Eye, X, Loader2 } from 'lucide-react'

type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed'

type DisputeItem = {
  _id: string
  category: string
  status: string
  disputeStatus: DisputeStatus
  disputeReason?: string
  disputeDecision?: string
  disputeRefundAmount?: number
  disputeAdminNote?: string
  disputeOpenedAt?: string
  disputeResolvedAt?: string
  escrowLocked: boolean
  clientId: string
  clientName?: string
  clientPhone?: string
  assignedProviderId?: string
  providerName?: string
  providerPhone?: string
  budget?: number
  paymentAmount?: number
  paymentDeposit?: number
  paymentStatus?: string
  createdAt: string
}

const decisionLabels: Record<string, string> = {
  release_escrow: 'Libérer au prestataire',
  refund: 'Rembourser le client (intégral)',
  partial_refund: 'Remboursement partiel',
  reject: 'Rejeter le litige (libérer au prestataire)',
  cancel: 'Annuler / clôturer sans effet',
  other: 'Autre',
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'resolved':
      return 'bg-emerald-100 text-emerald-700'
    case 'under_review':
      return 'bg-blue-100 text-blue-700'
    case 'closed':
      return 'bg-stone-100 text-stone-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

export default function AdminServiceDisputesPage() {
  const [items, setItems] = useState<DisputeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DisputeStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [selected, setSelected] = useState<DisputeItem | null>(null)
  const [decision, setDecision] = useState<string>('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [adminNote, setAdminNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const fetchDisputes = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = filter === 'all' ? '/api/admin/services/disputes' : `/api/admin/services/disputes?status=${filter}`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur de chargement')
      }
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDisputes()
  }, [filter])

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  const allFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (!q) return true
      const hay = [
        item.category,
        item.clientName,
        item.clientPhone,
        item.providerName,
        item.providerPhone,
        item.disputeReason,
        item._id,
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [items, search])

  const filteredItems = allFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasMore = page * PAGE_SIZE < allFiltered.length

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !decision) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/services/requests/${selected._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-dispute',
          decision,
          refundAmount: decision === 'partial_refund' ? Number(refundAmount) : undefined,
          adminNote,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de la résolution')
      }
      setSelected(null)
      setDecision('')
      setRefundAmount('')
      setAdminNote('')
      await fetchDisputes()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Scale className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">Litiges services</h1>
        </div>
        <button
          onClick={fetchDisputes}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Rafraîchir
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6 items-start md:items-center justify-between">
        <div className="flex gap-3">
          {(['all', 'open', 'under_review', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                filter === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'Tous' : s === 'under_review' ? 'En review' : s === 'resolved' ? 'Résolus' : 'Ouverts'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher client, prestataire, motif, ID..."
          className="w-full md:w-80 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-white rounded-xl border border-slate-100">
          Aucun litige trouvé.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Mission</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Prestataire</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Ouvert le</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.category}</div>
                    <div className="text-xs text-slate-500">{item._id.slice(-6).toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.clientName || '—'}</div>
                    <div className="text-xs text-slate-500">{item.clientPhone || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.providerName || '—'}</div>
                    <div className="text-xs text-slate-500">{item.providerPhone || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{(item.paymentAmount || 0).toLocaleString('fr-FR')} FCFA</div>
                    {item.paymentDeposit ? (
                      <div className="text-xs text-slate-500">Dépôt : {item.paymentDeposit.toLocaleString('fr-FR')} FCFA</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(item.disputeStatus || 'open')}`}>
                      {item.disputeStatus || 'open'}
                    </span>
                    {item.escrowLocked && (
                      <div className="text-xs text-amber-600 mt-1">Escrow verrouillé</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.disputeOpenedAt
                      ? new Date(item.disputeOpenedAt).toLocaleDateString('fr-FR')
                      : new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.disputeOpenedAt
                      ? (() => {
                          const hours = Math.round((Date.now() - new Date(item.disputeOpenedAt).getTime()) / 36e5)
                          const resolvedHours = item.disputeResolvedAt ? Math.round((new Date(item.disputeResolvedAt).getTime() - new Date(item.disputeOpenedAt).getTime()) / 36e5) : null
                          return (
                            <span className={resolvedHours === null && hours > 24 ? 'text-amber-600 font-medium' : ''}>
                              {resolvedHours !== null ? `${resolvedHours}h` : `${hours}h`}
                            </span>
                          )
                        })()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.disputeStatus === 'resolved' || item.disputeStatus === 'closed' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" /> {decisionLabels[item.disputeDecision || ''] || 'Résolu'}
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setSelected(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> Résoudre
                        </button>
                        <Link href={`/admin/services/disputes/${item._id}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-50">
                          Détail
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50"
        >
          Précédent
        </button>
        <span className="text-sm text-slate-600">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50"
        >
          Suivant
        </button>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Résoudre le litige</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <p><span className="font-medium">Client :</span> {selected.clientName || '—'} — {selected.clientPhone || '—'}</p>
                <p><span className="font-medium">Prestataire :</span> {selected.providerName || '—'} — {selected.providerPhone || '—'}</p>
                <p><span className="font-medium">Motif :</span> {selected.disputeReason || '—'}</p>
                <p><span className="font-medium">Montant payé :</span> {(selected.paymentAmount || 0).toLocaleString('fr-FR')} FCFA</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Décision</label>
                <select
                  required
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Choisir une décision</option>
                  {Object.entries(decisionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {decision === 'partial_refund' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant remboursé au client (FCFA)</label>
                  <input
                    type="number"
                    min={1}
                    max={selected.paymentAmount || 0}
                    required={decision === 'partial_refund'}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: 5000"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note admin (visible client/prestataire)</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={3}
                  placeholder="Motif de la décision..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !decision}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmer la décision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
