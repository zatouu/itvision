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
  visitsByOS: Array<{ os: string; count: number }>
  topReferrers: Array<{ referrer: string; count: number }>
  topIPs?: Array<{ ip: string; count: number }>
  topAnonymousIPs?: Array<{ ip: string; count: number }>
  recentVisits: RecentVisit[]
}

interface RecentVisit {
  id: string
  path: string
  pageName: string
  pageType: string
  ipAddress?: string
  userId?: string
  userRole?: string
  isAuthenticated: boolean
  sessionId?: string
  userAgent?: string
  deviceType?: string
  browser?: string
  os?: string
  referrer?: string
  duration?: number
  scrollDepth?: number
  interactions?: number
  visitedAt: string
}

const PERIOD_PRESETS = [7, 30, 90, 365] as const
const PAGE_TYPES = ['all', 'public', 'admin', 'client', 'technician'] as const
type PageTypeFilter = (typeof PAGE_TYPES)[number]
const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'acquisition', label: 'Acquisition' },
  { id: 'tech', label: 'Appareils & tech' },
  { id: 'activity', label: 'Activité détaillée' }
] as const
type TabId = (typeof TABS)[number]['id']

export default function VisitsAnalytics() {
  const [stats, setStats] = useState<VisitsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [refreshing, setRefreshing] = useState(false)
  const [pageTypeFilter, setPageTypeFilter] = useState<PageTypeFilter>('all')
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [activitySearch, setActivitySearch] = useState('')

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

  const getPageTypeLabel = (type: PageTypeFilter) => {
    if (type === 'all') return 'Tous les espaces'
    if (type === 'public') return 'Espace public'
    if (type === 'admin') return 'Espace admin'
    if (type === 'client') return 'Portail clients'
    if (type === 'technician') return 'Interface techniciens'
    return type
  }

  const getPageTypeFromPath = (path: string): 'public' | 'admin' | 'client' | 'technician' => {
    if (path.startsWith('/admin')) return 'admin'
    if (path.startsWith('/client')) return 'client'
    if (path.startsWith('/technicien')) return 'technician'
    return 'public'
  }

  const growthLabel =
    stats.growth === 0
      ? 'Stable vs période précédente'
      : stats.growth > 0
        ? `+${Math.abs(stats.growth).toFixed(1)}% vs période précédente`
        : `-${Math.abs(stats.growth).toFixed(1)}% vs période précédente`

  const growthColor =
    stats.growth === 0
      ? 'text-gray-500'
      : stats.growth > 0
        ? 'text-emerald-600'
        : 'text-red-600'

  const totalByPageType: Record<string, number> = stats.visitsByPageType.reduce(
    (acc, item) => {
      acc[item.type] = item.count
      return acc
    },
    {} as Record<string, number>
  )

  const filteredRecentVisits = stats.recentVisits.filter((visit) =>
    pageTypeFilter === 'all' ? true : visit.pageType === pageTypeFilter
  )

  const activityNeedle = activitySearch.trim().toLowerCase()
  const searchedRecentVisits = activityNeedle
    ? filteredRecentVisits.filter((visit) => {
        const haystack = [
          visit.ipAddress,
          visit.pageName,
          visit.path,
          visit.referrer,
          visit.userAgent,
          visit.userRole,
          visit.userId,
          visit.sessionId
        ]
          .filter(Boolean)
          .join(' | ')
          .toLowerCase()
        return haystack.includes(activityNeedle)
      })
    : filteredRecentVisits

  const filteredTopPages = stats.topPages.filter((page) => {
    if (pageTypeFilter === 'all') return true
    const type = getPageTypeFromPath(page.path)
    return type === pageTypeFilter
  })

  return (
    <div className="space-y-6">
      {/* En-tête type "marketplace" */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-2">
            <BarChart3 className="h-3 w-3" />
            <span>Vue d&apos;ensemble du trafic</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & visiteurs</h2>
          <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-1">
            <span className="font-medium text-gray-700">Derniers {days} jours</span>
            <span className="mx-1 text-gray-300">•</span>
            <span className={growthColor}>{growthLabel}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Segment :</span>
            {PAGE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPageTypeFilter(type)}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  pageTypeFilter === type
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{getPageTypeLabel(type)}</span>
                {type !== 'all' && typeof totalByPageType[type] === 'number' && (
                  <span className="ml-1 text-[10px] text-gray-400">
                    {totalByPageType[type].toLocaleString('fr-FR')} visites
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-1 py-1 shadow-sm">
            {PERIOD_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`px-3 py-1 text-xs md:text-sm rounded-full font-medium transition ${
                  days === value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {value === 7 && '7 j'}
                {value === 30 && '30 j'}
                {value === 90 && '90 j'}
                {value === 365 && '1 an'}
              </button>
            ))}
          </div>
          <button
            onClick={loadStats}
            disabled={refreshing}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Onglets principaux */}
      <div className="mt-2 border-b border-gray-200 flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-3 py-2 text-xs md:text-sm font-medium whitespace-nowrap transition border-b-2 ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
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

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.uniqueVisitors.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">Visiteurs uniques</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.authenticatedVisits.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">Visites authentifiées</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.anonymousVisits.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">Visites anonymes</div>
        </div>
      </div>
      {/* Contenu par onglet */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pages les plus visitées */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pages les plus visitées</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Vue filtrée sur : <span className="font-medium text-gray-700">{getPageTypeLabel(pageTypeFilter)}</span>
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {filteredTopPages.slice(0, 5).map((page, index) => (
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
        </>
      )}

      {activeTab === 'acquisition' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Origines du trafic */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Origines du trafic</h3>
            <div className="space-y-3">
              {stats.topReferrers.slice(0, 10).map((item) => {
                const total = stats.topReferrers.reduce((sum, i) => sum + i.count, 0)
                const percentage = total > 0 ? (item.count / total) * 100 : 0
                return (
                  <div key={item.referrer}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="text-sm font-medium text-gray-700 truncate" title={item.referrer}>
                          {item.referrer}
                        </div>
                      </div>
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

          <div className="space-y-6">
            {/* Top IPs */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Top IPs</h3>
              <p className="text-xs text-gray-500 mb-4">Sources les plus actives (volume)</p>
              <div className="space-y-3">
                {(stats.topIPs || []).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune IP disponible</p>
                ) : (
                  (stats.topIPs || []).slice(0, 10).map((item) => (
                    <div key={item.ip} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-800 truncate max-w-[220px]" title={item.ip}>
                        {item.ip}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
              {(stats.topAnonymousIPs || []).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Top IPs anonymes</p>
                  <div className="space-y-2">
                    {(stats.topAnonymousIPs || []).slice(0, 5).map((item) => (
                      <div key={item.ip} className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-700 truncate max-w-[220px]" title={item.ip}>
                          {item.ip}
                        </span>
                        <span className="text-xs font-semibold text-gray-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visites par type de page (rappel) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par espace</h3>
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
          </div>
        </div>
      )}

      {activeTab === 'tech' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Navigateurs & OS empilés */}
          <div className="space-y-6">
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

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Systèmes d'exploitation</h3>
              <div className="space-y-3">
                {stats.visitsByOS.map((item) => {
                  const total = stats.visitsByOS.reduce((sum, i) => sum + i.count, 0)
                  const percentage = total > 0 ? (item.count / total) * 100 : 0
                  return (
                    <div key={item.os}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.os}</span>
                        <span className="text-sm font-semibold text-gray-700">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && searchedRecentVisits.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dernières visites (détails)</h3>
              <p className="text-xs text-gray-500 mt-1">
                IP source, rôle, device, navigateur, OS, referrer et user-agent
                {pageTypeFilter !== 'all' && (
                  <>
                    <span className="mx-1 text-gray-300">•</span>
                    <span className="font-medium text-gray-700">Segment : {getPageTypeLabel(pageTypeFilter)}</span>
                  </>
                )}
              </p>
            </div>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <input
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              placeholder="Rechercher (IP, page, referrer, UA, userId…)"
              className="w-full md:max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <div className="text-xs text-gray-500">
              {searchedRecentVisits.length.toLocaleString('fr-FR')} / {filteredRecentVisits.length.toLocaleString('fr-FR')} affichées
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">IP</th>
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Rôle</th>
                  <th className="py-2 pr-4">Auth</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Nav.</th>
                  <th className="py-2 pr-4">OS</th>
                  <th className="py-2 pr-4">Referrer</th>
                  <th className="py-2 pr-4 hidden lg:table-cell">UA</th>
                </tr>
              </thead>
              <tbody>
                {searchedRecentVisits.slice(0, 20).map((visit) => (
                  <tr key={visit.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-gray-700">
                      {new Date(visit.visitedAt).toLocaleString('fr-FR')}
                    </td>
                    <td
                      className="py-2 pr-4 font-mono text-gray-800 cursor-pointer hover:text-emerald-700"
                      title="Cliquer pour copier l'IP"
                      onClick={async () => {
                        try {
                          const value = visit.ipAddress || ''
                          if (!value) return
                          await navigator.clipboard.writeText(value)
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      {visit.ipAddress || 'inconnue'}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-gray-800 truncate max-w-[180px]" title={visit.pageName}>
                        {visit.pageName}
                      </div>
                      <div className="text-gray-400 text-xs truncate max-w-[180px]" title={visit.path}>
                        {visit.path}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-700 capitalize">{visit.pageType}</td>
                    <td className="py-2 pr-4 text-gray-700">{visit.userRole || 'Anonyme'}</td>
                    <td className="py-2 pr-4 text-gray-700">{visit.isAuthenticated ? 'Oui' : 'Non'}</td>
                    <td className="py-2 pr-4 text-gray-700 capitalize">{visit.deviceType || '-'}</td>
                    <td className="py-2 pr-4 text-gray-700">{visit.browser || '-'}</td>
                    <td className="py-2 pr-4 text-gray-700">{visit.os || '-'}</td>
                    <td className="py-2 pr-4 text-gray-700 truncate max-w-[180px]" title={visit.referrer || undefined}>
                      {visit.referrer || '-'}
                    </td>
                    <td className="py-2 pr-4 text-gray-700 truncate max-w-[260px] hidden lg:table-cell" title={visit.userAgent || undefined}>
                      {visit.userAgent || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

