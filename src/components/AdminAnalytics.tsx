'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  Target, 
  Activity, 
  Star, 
  Wrench, 
  CheckCircle, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Download,
  Filter,
  Eye
} from 'lucide-react'

interface AnalyticsData {
  revenue: {
    current: number
    previous: number
    trend: 'up' | 'down' | 'stable'
    growth: number
  }
  projects: {
    total: number
    completed: number
    inProgress: number
    completionRate: number
    avgDuration: number
  }
  clients: {
    total: number
    active: number
    satisfaction: number
    retention: number
  }
  team: {
    utilization: number
    productivity: number
    avgRating: number
    onTimeDelivery: number
  }
  performance: {
    responseTime: number
    issueResolution: number
    maintenanceCompliance: number
    qualityScore: number
  }
}

export default function AdminAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  // Données simulées (en production, récupérer via API)
  useEffect(() => {
    setLoading(true)
    
    // Simulation d'un délai API
    setTimeout(() => {
      setAnalyticsData({
        revenue: {
          current: 8750000,
          previous: 7200000,
          trend: 'up',
          growth: 21.5
        },
        projects: {
          total: 47,
          completed: 35,
          inProgress: 8,
          completionRate: 89.2,
          avgDuration: 12.5
        },
        clients: {
          total: 28,
          active: 24,
          satisfaction: 4.6,
          retention: 92.3
        },
        team: {
          utilization: 87.5,
          productivity: 94.2,
          avgRating: 4.7,
          onTimeDelivery: 91.8
        },
        performance: {
          responseTime: 2.3,
          issueResolution: 95.4,
          maintenanceCompliance: 98.1,
          qualityScore: 4.8
        }
      })
      setLoading(false)
    }, 1000)
  }, [timeRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (trend: string, growth: number) => {
    if (trend === 'up') return <ArrowUp className="h-4 w-4 text-green-600" />
    if (trend === 'down') return <ArrowDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600'
    if (trend === 'down') return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Chargement des analytics...</span>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
        <p className="text-gray-600">Erreur lors du chargement des données</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 Analytics Business</h2>
          <p className="text-gray-600">Analyse détaillée des performances</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">3 derniers mois</option>
            <option value="1y">12 derniers mois</option>
          </select>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Chiffre d'affaires */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-gray-900">Chiffre d'Affaires</h3>
            </div>
            {getTrendIcon(analyticsData.revenue.trend, analyticsData.revenue.growth)}
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(analyticsData.revenue.current / 1000000)}M FCFA
            </div>
            <div className={`text-sm flex items-center ${getTrendColor(analyticsData.revenue.trend)}`}>
              <span>{analyticsData.revenue.growth > 0 ? '+' : ''}{analyticsData.revenue.growth}%</span>
              <span className="text-gray-500 ml-2">vs période précédente</span>
            </div>
          </div>
        </div>

        {/* Projets */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Projets</h3>
            </div>
            <CheckCircle className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData.projects.completed}/{analyticsData.projects.total}
            </div>
            <div className="text-sm text-gray-600">
              {formatPercentage(analyticsData.projects.completionRate)} terminés
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${analyticsData.projects.completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Satisfaction client */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Star className="h-6 w-6 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Satisfaction</h3>
            </div>
            <Users className="h-5 w-5 text-yellow-600" />
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-yellow-600">
              {analyticsData.clients.satisfaction.toFixed(1)}/5
            </div>
            <div className="text-sm text-gray-600">
              {analyticsData.clients.active} clients actifs
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`h-4 w-4 ${
                    star <= analyticsData.clients.satisfaction 
                      ? 'text-yellow-500 fill-current' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Performance équipe */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Performance</h3>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-purple-600">
              {formatPercentage(analyticsData.team.productivity)}
            </div>
            <div className="text-sm text-gray-600">
              Productivité équipe
            </div>
            <div className="text-xs text-gray-500">
              {formatPercentage(analyticsData.team.onTimeDelivery)} livraisons à temps
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques détaillés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du CA */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Évolution du Chiffre d'Affaires</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {/* Simulation d'un graphique simple */}
            <div className="space-y-3">
              {[
                { month: 'Jan', value: 6200000, percentage: 70 },
                { month: 'Fév', value: 7100000, percentage: 80 },
                { month: 'Mar', value: 8750000, percentage: 100 },
              ].map((item) => (
                <div key={item.month} className="flex items-center space-x-4">
                  <div className="w-12 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-20 text-sm font-medium text-gray-900">
                    {Math.round(item.value / 1000000)}M
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Répartition par type de projet */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Répartition des Projets</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {[
              { type: 'Vidéosurveillance', count: 18, color: 'bg-blue-500', percentage: 45 },
              { type: 'Contrôle d\'accès', count: 12, color: 'bg-green-500', percentage: 30 },
              { type: 'Domotique', count: 8, color: 'bg-purple-500', percentage: 20 },
              { type: 'Alarme', count: 2, color: 'bg-yellow-500', percentage: 5 }
            ].map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded ${item.color}`}></div>
                  <span className="text-sm text-gray-700">{item.type}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métriques détaillées */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Métriques Détaillées</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Temps de réponse */}
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{analyticsData.performance.responseTime}h</div>
            <div className="text-sm text-gray-600">Temps de réponse moyen</div>
          </div>

          {/* Résolution des problèmes */}
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-3">
              <Wrench className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(analyticsData.performance.issueResolution)}</div>
            <div className="text-sm text-gray-600">Résolution des problèmes</div>
          </div>

          {/* Conformité maintenance */}
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(analyticsData.performance.maintenanceCompliance)}</div>
            <div className="text-sm text-gray-600">Conformité maintenance</div>
          </div>

          {/* Score qualité */}
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-3">
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{analyticsData.performance.qualityScore.toFixed(1)}/5</div>
            <div className="text-sm text-gray-600">Score qualité</div>
          </div>
        </div>
      </div>

      {/* Tendances et insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights positifs */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Tendances Positives</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">CA en hausse de 21.5% ce mois</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">Taux de satisfaction client à 4.6/5</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">98% de conformité maintenance</span>
            </div>
          </div>
        </div>

        {/* Points d'attention */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Points d'Attention</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">4 projets en retard sur planning</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Utilisation équipe à 87% (optimisable)</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">2 clients avec satisfaction &lt; 4/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}