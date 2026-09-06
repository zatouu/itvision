'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Shield, CheckCircle, XCircle, ArrowUpCircle, Loader2 } from 'lucide-react'

interface MarketplaceUser {
  _id: string
  name: string
  email: string
  phone?: string
  marketplaceTier: string
  marketplaceOrderCount: number
  totalMarketplacePurchases: number
  proRequestedAt?: string
  proValidatedAt?: string
}

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  standard: { label: 'Standard', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  pro: { label: 'Pro', className: 'bg-green-100 text-green-700 border-green-200' },
  reseller: { label: 'Revendeur', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  partner: { label: 'Partenaire', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
}

export default function ComptesProPage() {
  const [pendingUsers, setPendingUsers] = useState<MarketplaceUser[]>([])
  const [activeUsers, setActiveUsers] = useState<MarketplaceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/marketplace/users', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur chargement')

      const users: MarketplaceUser[] = data.users || []
      setPendingUsers(users.filter(u => u.proRequestedAt && !u.proValidatedAt && u.marketplaceTier === 'standard'))
      setActiveUsers(users.filter(u => u.marketplaceTier !== 'standard'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function changeTier(userId: string, tier: string) {
    setActionLoading(userId)
    try {
      let csrfToken: string | null = null
      try {
        const csrfRes = await fetch('/api/csrf', { credentials: 'include' })
        const csrfData = await csrfRes.json().catch(() => ({}))
        csrfToken = csrfData?.csrfToken || null
      } catch {}

      const res = await fetch(`/api/admin/users/${userId}/marketplace-tier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      await fetchUsers()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  function UserRow({ user, showActions = true }: { user: MarketplaceUser; showActions?: boolean }) {
    const badge = TIER_BADGES[user.marketplaceTier] || TIER_BADGES.standard
    const isLoading = actionLoading === user._id

    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
        <td className="px-4 py-3">
          <div className="font-medium text-sm text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-sm font-semibold tabular-nums">{user.marketplaceOrderCount}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-semibold tabular-nums">{user.totalMarketplacePurchases.toLocaleString('fr-FR')}</span>
          <span className="text-xs text-gray-400 ml-1">FCFA</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.className}`}>
            {badge.label}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 text-center">
          {user.proRequestedAt ? new Date(user.proRequestedAt).toLocaleDateString('fr-FR') : '-'}
        </td>
        {showActions && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5 justify-end">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <>
                  {user.marketplaceTier !== 'pro' && (
                    <button
                      onClick={() => changeTier(user._id, 'pro')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition"
                      title="Promouvoir Pro"
                    >
                      Pro
                    </button>
                  )}
                  {user.marketplaceTier !== 'reseller' && (
                    <button
                      onClick={() => changeTier(user._id, 'reseller')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition"
                      title="Promouvoir Revendeur"
                    >
                      Revendeur
                    </button>
                  )}
                  {user.marketplaceTier !== 'standard' && (
                    <button
                      onClick={() => changeTier(user._id, 'standard')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                      title="Retrograder Standard"
                    >
                      Standard
                    </button>
                  )}
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptes Marketplace Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Gerez les tiers marketplace et validez les demandes Pro.</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
        >
          Retour admin
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Chargement...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="space-y-8">
          {/* Demandes en attente */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpCircle className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Demandes en attente
                {pendingUsers.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-violet-100 text-violet-700 rounded-full">
                    {pendingUsers.length}
                  </span>
                )}
              </h2>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                Aucune demande en attente.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Utilisateur</th>
                      <th className="px-4 py-3 text-center">Commandes</th>
                      <th className="px-4 py-3 text-right">Cumul achats</th>
                      <th className="px-4 py-3 text-center">Tier</th>
                      <th className="px-4 py-3 text-center">Date demande</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => <UserRow key={u._id} user={u} />)}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Comptes Pro actifs */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Comptes Pro actifs
                <span className="ml-2 text-sm font-normal text-gray-400">({activeUsers.length})</span>
              </h2>
            </div>

            {activeUsers.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                Aucun compte Pro actif.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Utilisateur</th>
                      <th className="px-4 py-3 text-center">Commandes</th>
                      <th className="px-4 py-3 text-right">Cumul achats</th>
                      <th className="px-4 py-3 text-center">Tier</th>
                      <th className="px-4 py-3 text-center">Valide depuis</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map(u => (
                      <UserRow key={u._id} user={{...u, proRequestedAt: u.proValidatedAt}} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
