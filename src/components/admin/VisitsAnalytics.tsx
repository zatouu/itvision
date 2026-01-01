'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Eye, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  RefreshCw,
  AlertCircle
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
  const router = useRouter()
  const [stats, setStats] = useState<VisitsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/analytics/visits?days=${days}`, {
        credentials: 'include'
      })
      
      // Gérer les erreurs d'authentification
      if (response.status === 401) {
        router.push('/login')
        return
      }
      
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error || 'Erreur lors du chargement des données')
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err)
      setError('Impossible de charger les statistiques. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [days, router])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadStats}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Réessayer
        </button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
          <Eye className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune donnée</h3>
        <p className="text-gray-500">Les statistiques de visites ne sont pas encore disponibles.</p>
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
      {/* En-tête responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Statistiques de visites</h2>
          <p className="text-sm text-gray-500 mt-1">Analyse du trafic du site</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
            <option value={365}>1 an</option>
          </select>
          <button
            onClick={loadStats}
            disabled={refreshing}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex-shrink-0"
            aria-label="Rafraîchir les données"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPIs responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            {stats.growth !== 0 && (
              <div className={`flex items-center gap-1 text-xs sm:text-sm ${stats.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.growth > 0 ? <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />}
                <span>{Math.abs(stats.growth).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalVisits.toLocaleString('fr-FR')}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total visites</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.uniqueVisitors.toLocaleString('fr-FR')}</div>
          <div className="text-xs sm:text-sm text-gray-500">Visiteurs uniques</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.authenticatedVisits.toLocaleString('fr-FR')}</div>
          <div className="text-xs sm:text-sm text-gray-500">Authentifiées</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.anonymousVisits.toLocaleString('fr-FR')}</div>
          <div className="text-xs sm:text-sm text-gray-500">Anonymes</div>
        </div>
      </div>

      {/* Graphiques responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pages les plus visitées */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Pages les plus visitées</h3>
          <div className="space-y-3">
            {stats.topPages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
            ) : (
              stats.topPages.slice(0, 5).map((page, index) => (
                <div key={page.path} className="flex items-center justify-between gap-3 group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{page.pageName || page.path}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 truncate">{page.path}</div>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-700 flex-shrink-0">{page.visits.toLocaleString('fr-FR')}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visites par type de page */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Visites par type</h3>
          <div className="space-y-4">
            {stats.visitsByPageType.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
            ) : (
              stats.visitsByPageType.map((item) => {
                const total = stats.visitsByPageType.reduce((sum, i) => sum + i.count, 0)
                const percentage = total > 0 ? (item.count / total) * 100 : 0
                return (
                  <div key={item.type} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full ${getPageTypeColor(item.type)}`}>
                        {item.type || 'Autre'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">{item.count.toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Appareils */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Appareils</h3>
          <div className="space-y-4">
            {stats.visitsByDevice.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
            ) : (
              stats.visitsByDevice.map((item) => {
                const total = stats.visitsByDevice.reduce((sum, i) => sum + i.count, 0)
                const percentage = total > 0 ? (item.count / total) * 100 : 0
                return (
                  <div key={item.device} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{getDeviceIcon(item.device)}</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-700 capitalize">{item.device || 'Inconnu'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">{item.count.toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Navigateurs */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Navigateurs</h3>
          <div className="space-y-4">
            {stats.visitsByBrowser.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
            ) : (
              stats.visitsByBrowser.map((item) => {
                const total = stats.visitsByBrowser.reduce((sum, i) => sum + i.count, 0)
                const percentage = total > 0 ? (item.count / total) * 100 : 0
                return (
                  <div key={item.browser} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{item.browser || 'Inconnu'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">{item.count.toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Courbe des visites - responsive et optimisée */}
      {stats.visitsByDay.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Évolution des visites</h3>
            <span className="text-xs text-gray-500">
              {stats.visitsByDay.length} jour{stats.visitsByDay.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <div 
              className="h-48 sm:h-64 flex items-end gap-0.5 sm:gap-1"
              style={{ minWidth: stats.visitsByDay.length > 30 ? `${stats.visitsByDay.length * 12}px` : '100%' }}
            >
              {(() => {
                const maxVisits = Math.max(...stats.visitsByDay.map(d => d.count), 1)
                // Réduire les données si trop nombreuses (afficher max 60 points)
                const dataToShow = stats.visitsByDay.length > 60 
                  ? stats.visitsByDay.filter((_, i) => i % Math.ceil(stats.visitsByDay.length / 60) === 0)
                  : stats.visitsByDay
                
                return dataToShow.map((day, index) => {
                  const height = maxVisits > 0 ? (day.count / maxVisits) * 100 : 0
                  const showLabel = dataToShow.length <= 14 || index % Math.ceil(dataToShow.length / 10) === 0
                  
                  return (
                    <div 
                      key={day.date} 
                      className="flex-1 min-w-[8px] flex flex-col items-center group"
                    >
                      <div className="w-full flex items-end justify-center relative" style={{ height: '160px' }}>
                        {/* Tooltip au hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            <div className="font-medium">{day.count} visites</div>
                            <div className="text-gray-300">
                              {new Date(day.date).toLocaleDateString('fr-FR', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </div>
                          </div>
                        </div>
                        <div
                          className="w-full bg-emerald-500 rounded-t transition-all duration-200 hover:bg-emerald-400 cursor-pointer"
                          style={{ 
                            height: `${Math.max(height, 2)}%`,
                            minHeight: day.count > 0 ? '4px' : '2px'
                          }}
                        />
                      </div>
                      {showLabel && (
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-1 transform -rotate-45 origin-center whitespace-nowrap h-8">
                          {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
          {/* Légende */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span>
              {new Date(stats.visitsByDay[0]?.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="font-medium text-gray-700">
              Moyenne: {Math.round(stats.visitsByDay.reduce((sum, d) => sum + d.count, 0) / stats.visitsByDay.length)} visites/jour
            </span>
            <span>
              {new Date(stats.visitsByDay[stats.visitsByDay.length - 1]?.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

