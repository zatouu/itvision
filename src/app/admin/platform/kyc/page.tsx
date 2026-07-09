'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Check, X, Search, Eye } from 'lucide-react'

type KycItem = {
  _id: string
  providerId: string
  fullName: string
  trade: string
  status: 'pending' | 'approved' | 'rejected'
  idCardFrontUrl: string
  idCardBackUrl?: string
  selfieUrl: string
  rejectionReason?: string
  reviewedAt?: string
  createdAt: string
  providerPhone: string
  providerName: string
  providerEmail: string
  kycVerified: boolean
}

export default function PlatformKycPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<KycItem[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<KycItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/kyc?status=${filter}`, { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        return
      }
      const data = await res.json()
      if (data.success) setItems(data.items)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter])

  const decide = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Veuillez indiquer un motif de refus.')
      return
    }
    setProcessingId(id)
    try {
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejectionReason: action === 'reject' ? rejectionReason : undefined }),
      })
      if (!res.ok) throw new Error('Erreur')
      setSelected(null)
      setRejectionReason('')
      load()
    } catch (e) {
      alert('Action impossible, réessayez.')
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = items.filter((i) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      i.fullName.toLowerCase().includes(q) ||
      i.providerPhone.toLowerCase().includes(q) ||
      i.providerEmail.toLowerCase().includes(q) ||
      i.trade.toLowerCase().includes(q)
    )
  })

  const statusBadge = (status: string) => {
    const map: Record<string, { text: string; class: string }> = {
      pending: { text: 'En attente', class: 'bg-amber-100 text-amber-700' },
      approved: { text: 'Approuvé', class: 'bg-emerald-100 text-emerald-700' },
      rejected: { text: 'Refusé', class: 'bg-red-100 text-red-700' },
    }
    const s = map[status] || { text: status, class: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.class}`}>{s.text}</span>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            KYC Prestataires
          </h1>
          <p className="text-sm text-gray-500 mt-1">Validation des documents d'identité et selfies.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone, email, métier..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  filter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Refusés'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Prestataire</th>
                <th className="px-4 py-3">Métier</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
              )}
              {filtered.map((k) => (
                <tr key={k._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{k.providerName || k.fullName}</div>
                      <div className="text-xs text-gray-500">{k.providerPhone || k.providerEmail}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{k.trade}</td>
                  <td className="px-4 py-3">{statusBadge(k.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(k.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(k)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                      >
                        <Eye className="h-4 w-4" /> Voir
                      </button>
                      {k.status === 'pending' && (
                        <>
                          <button
                            onClick={() => decide(k._id, 'approve')}
                            disabled={processingId === k._id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" /> Approuver
                          </button>
                          <button
                            onClick={() => setSelected(k)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
                          >
                            <X className="h-4 w-4" /> Refuser
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucune demande KYC</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Dossier KYC</h2>
              <button onClick={() => { setSelected(null); setRejectionReason('') }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Nom complet</div>
                  <div className="text-gray-900 font-medium">{selected.fullName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Métier</div>
                  <div className="text-gray-900 font-medium">{selected.trade}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Téléphone</div>
                  <div className="text-gray-900 font-medium">{selected.providerPhone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</div>
                  <div className="text-gray-900 font-medium">{selected.providerEmail || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">CNI Recto</div>
                  <img src={selected.idCardFrontUrl} alt="CNI recto" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">CNI Verso</div>
                  {selected.idCardBackUrl ? (
                    <img src={selected.idCardBackUrl} alt="CNI verso" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm">Non fourni</div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Selfie</div>
                  <img src={selected.selfieUrl} alt="Selfie" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                </div>
              </div>

              {selected.status === 'rejected' && selected.rejectionReason && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <span className="font-semibold">Motif du refus :</span> {selected.rejectionReason}
                </div>
              )}

              {selected.status === 'pending' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Motif de refus (obligatoire pour refuser)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Documents flous, informations incorrectes..."
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => { setSelected(null); setRejectionReason('') }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                {selected.status === 'pending' && (
                  <>
                    <button
                      onClick={() => decide(selected._id, 'reject')}
                      disabled={processingId === selected._id}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Refuser
                    </button>
                    <button
                      onClick={() => decide(selected._id, 'approve')}
                      disabled={processingId === selected._id}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approuver
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
