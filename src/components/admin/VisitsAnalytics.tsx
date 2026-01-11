'use client'

import { useState, useEffect } from 'react'
import { 
  Eye, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  BarChart3,
  Calendar,
  RefreshCw
} from 'lucide-react'

interface VisitsStats {
  totalVisits: number
  uniqueVisitors: number
  authenticatedVisits: number
  anonymousVisits: number
  growth: number
  visitsByPageType: Array<{ type: string; count: number }>
  topPages: Array<{ path: string; pageName: string; visits: number }>
  visitsByDay: Array<{ date: string; count: number }>
  visitsByDevice: Array<{ device: string; count: number }>
  visitsByBrowser: Array<{ browser: string; count: number }>
}

export default function VisitsAnalytics() {
  const [stats, setStats] = useState<VisitsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/admin/analytics/visits?days=${days}`)
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [days])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    )
  }

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return <Monitor className="h-4 w-4" />
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'tablet': return <Tablet className="h-4 w-4" />
      default: return <Globe className="h-4 w-4" />
    }
  }

  const getPageTypeColor = (type: string) => {
    switch (type) {
      case 'public': return 'bg-blue-100 text-blue-700'
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'client': return 'bg-green-100 text-green-700'
      case 'technician': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistiques de visites</h2>
          <p className="text-sm text-gray-500 mt-1">Analyse du trafic du site</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
            <option value={365}>1 an</option>
          </select>
          <button
            onClick={loadStats}
            disabled={refreshing}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            {stats.growth !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${stats.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.growth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{Math.abs(stats.growth).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalVisits.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">Total visites</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.uniqueVisitors.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">Visiteurs uniques</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.authenticatedVisits.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">Visites authentifiées</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.anonymousVisits.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">Visites anonymes</div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pages les plus visitées */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pages les plus visitées</h3>
          <div className="space-y-3">
            {stats.topPages.slice(0, 5).map((page, index) => (
              <div key={page.path} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{page.pageName}</div>
                    <div className="text-xs text-gray-500 truncate">{page.path}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">{page.visits}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Visites par type de page */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visites par type</h3>
          <div className="space-y-3">
            {stats.visitsByPageType.map((item) => {
              const total = stats.visitsByPageType.reduce((sum, i) => sum + i.count, 0)
              const percentage = total > 0 ? (item.count / total) * 100 : 0
              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getPageTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Appareils */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Appareils</h3>
          <div className="space-y-3">
            {stats.visitsByDevice.map((item) => {
              const total = stats.visitsByDevice.reduce((sum, i) => sum + i.count, 0)
              const percentage = total > 0 ? (item.count / total) * 100 : 0
              return (
                <div key={item.device}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(item.device)}
                      <span className="text-sm font-medium text-gray-700 capitalize">{item.device}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Navigateurs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigateurs</h3>
          <div className="space-y-3">
            {stats.visitsByBrowser.map((item) => {
              const total = stats.visitsByBrowser.reduce((sum, i) => sum + i.count, 0)
              const percentage = total > 0 ? (item.count / total) * 100 : 0
              return (
                <div key={item.browser}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.browser}</span>
                    <span className="text-sm font-semibold text-gray-700">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Courbe des visites */}
      {stats.visitsByDay.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des visites</h3>
          <div className="h-64 flex items-end justify-between gap-1">
            {stats.visitsByDay.map((day) => {
              const maxVisits = Math.max(...stats.visitsByDay.map(d => d.count))
              const height = maxVisits > 0 ? (day.count / maxVisits) * 100 : 0
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                    <div
                      className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.count} visites`}
                    />
                  </div>
                  <div className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                    {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

