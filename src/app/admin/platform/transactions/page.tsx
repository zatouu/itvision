'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

type TransactionItem = {
  _id: string
  kind: string
  points: number
  balanceAfter: number
  description?: string
  paymentRef?: string
  createdAt: string
  user: { name?: string; phone?: string; role?: string } | null
}

const KIND_LABELS: Record<string, string> = {
  welcome: 'Bienvenue',
  topup: 'Recharge',
  mission_spend: 'Mission',
  referral_bonus: 'Parrainage',
  refund: 'Remboursement',
  admin_adjust: 'Admin',
  escrow_charge: 'Frais escrow',
  escrow_refund: 'Remb. escrow',
}

const KIND_COLORS: Record<string, string> = {
  welcome: 'bg-emerald-100 text-emerald-700',
  topup: 'bg-blue-100 text-blue-700',
  mission_spend: 'bg-rose-100 text-rose-700',
  referral_bonus: 'bg-purple-100 text-purple-700',
  refund: 'bg-orange-100 text-orange-700',
  admin_adjust: 'bg-gray-100 text-gray-700',
  escrow_charge: 'bg-amber-100 text-amber-700',
  escrow_refund: 'bg-teal-100 text-teal-700',
}

export default function PlatformTransactionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [page, search, kind, from, to])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (kind) params.set('kind', kind)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/admin/platform/transactions?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setItems(data.transactions)
        setTotal(data.pagination.total)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions Points</h1>
          <p className="text-sm text-gray-500 mt-1">Historique complet des mouvements de points.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Rechercher par nom, téléphone..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={kind}
              onChange={(e) => { setKind(e.target.value); setPage(1) }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Tous types</option>
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1) }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Solde après</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
              )}
              {items.map((t) => (
                <tr key={t._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{t.user?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{t.user?.phone || '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${KIND_COLORS[t.kind] || 'bg-gray-100 text-gray-700'}`}>
                      {KIND_LABELS[t.kind] || t.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{t.description || '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.points > 0 ? '+' : ''}{t.points}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">{t.balanceAfter}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune transaction</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{total} transactions</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">Page {page} / {Math.max(1, totalPages)}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
