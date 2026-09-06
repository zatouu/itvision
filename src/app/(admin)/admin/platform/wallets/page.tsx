'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

type WalletItem = {
  _id: string
  userId: string
  points: number
  lifetimePointsEarned: number
  lifetimePointsSpent: number
  createdAt: string
  user: { name?: string; phone?: string; email?: string; role?: string } | null
}

export default function PlatformWalletsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('points')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadWallets()
  }, [page, search, sortBy, sortOrder])

  const loadWallets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortOrder })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/platform/wallets?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setWallets(data.wallets)
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
          <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
          <p className="text-sm text-gray-500 mt-1">Vue d'ensemble des soldes points utilisateurs.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Rechercher par nom, téléphone, email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => {
              const next = sortOrder === 'desc' ? 'asc' : 'desc'
              setSortOrder(next)
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortBy} {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Gagnés (cumulé)</th>
                <th className="px-4 py-3 text-right">Dépensés (cumulé)</th>
                <th className="px-4 py-3">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {loading && wallets.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
              )}
              {wallets.map((w) => (
                <tr key={w._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{w.user?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{w.user?.phone || w.user?.email || '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{w.user?.role?.toLowerCase()}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{w.points}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{w.lifetimePointsEarned}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{w.lifetimePointsSpent}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(w.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
              {!loading && wallets.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun wallet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{total} wallets</span>
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
