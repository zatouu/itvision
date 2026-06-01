'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Wrench, UserCheck, TrendingUp, Wallet, CreditCard, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'

type AnalyticsData = {
  users: {
    total: number
    newToday: number
    newThisWeek: number
    newThisMonth: number
    providers: number
    clients: number
  }
  missions: {
    total: number
    byStatus: Record<string, number>
    today: number
    thisWeek: number
    thisMonth: number
    trend: { date: string; count: number }[]
  }
  wallet: {
    totalPointsInCirculation: number
    totalLifetimeEarned: number
    totalLifetimeSpent: number
    walletCount: number
    totalTopups: number
    totalEscrowCharges: number
  }
  payments: {
    total: number
    byStatus: Record<string, number>
  }
}

export default function PlatformAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/platform/analytics', { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        else setError('Erreur chargement analytics')
        return
      }
      const json = await res.json()
      if (json.success) {
        setData(json.analytics)
        setLastUpdated(new Date())
      }
    } catch (e) {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({
    title, value, sub, icon: Icon, color, trend,
  }: {
    title: string
    value: string | number
    sub?: string
    icon: any
    color: string
    trend?: 'up' | 'down'
  }) => {
    const bgClass = color === 'emerald' ? 'bg-emerald-100 text-emerald-600'
      : color === 'blue' ? 'bg-blue-100 text-blue-600'
      : color === 'purple' ? 'bg-purple-100 text-purple-600'
      : color === 'orange' ? 'bg-orange-100 text-orange-600'
      : color === 'rose' ? 'bg-rose-100 text-rose-600'
      : 'bg-gray-100 text-gray-600'
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-rose-500" />}
                {sub}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${bgClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error || 'Aucune donnée'}</p>
        <button onClick={loadAnalytics} className="mt-4 text-emerald-600 hover:underline text-sm">Réessayer</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Plateforme</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi, tendances et KPIs de l'écosystème mobile.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Mis à jour {lastUpdated.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button
            onClick={loadAnalytics}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Activity className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Utilisateurs totaux"
          value={data.users.total}
          sub={`+${data.users.newThisMonth} ce mois`}
          icon={Users}
          color="emerald"
          trend="up"
        />
        <StatCard
          title="Prestataires"
          value={data.users.providers}
          sub={`${data.users.clients} clients`}
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="Missions totales"
          value={data.missions.total}
          sub={`+${data.missions.thisWeek} cette semaine`}
          icon={TrendingUp}
          color="purple"
          trend="up"
        />
        <StatCard
          title="Points en circulation"
          value={data.wallet.totalPointsInCirculation.toLocaleString('fr-FR')}
          sub={`${data.wallet.walletCount} wallets`}
          icon={Wallet}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Missions trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tendances missions (7 jours)</h3>
          <div className="flex items-end gap-2 h-40">
            {data.missions.trend.map((d, i) => {
              const max = Math.max(...data.missions.trend.map(t => t.count), 1)
              const height = max > 0 ? (d.count / max) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full max-w-[40px] bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${d.date}: ${d.count} missions`}
                  />
                  <span className="text-[10px] text-gray-500 truncate w-full text-center">
                    {d.date.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Missions by status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Missions par statut</h3>
          <div className="space-y-3">
            {Object.entries(data.missions.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(data.missions.byStatus).length === 0 && (
              <p className="text-sm text-gray-400">Aucune mission</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet stats */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">Économie des points</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Points gagnés (cumulé)</span>
              <span className="text-sm font-bold text-emerald-600">{data.wallet.totalLifetimeEarned.toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Points dépensés (cumulé)</span>
              <span className="text-sm font-bold text-rose-600">{data.wallet.totalLifetimeSpent.toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recharges (topups)</span>
              <span className="text-sm font-bold text-gray-900">{data.wallet.totalTopups}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Frais escrow prélevés</span>
              <span className="text-sm font-bold text-blue-600">{data.wallet.totalEscrowCharges}</span>
            </div>
          </div>
        </div>

        {/* Payments by status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Paiements</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total transactions</span>
              <span className="text-sm font-bold text-gray-900">{data.payments.total}</span>
            </div>
            {Object.entries(data.payments.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{status}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(data.payments.byStatus).length === 0 && (
              <p className="text-sm text-gray-400">Aucun paiement</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
