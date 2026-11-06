'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  Calendar,
  Loader2,
  RefreshCw,
  Download,
  PieChart,
  LineChart,
  AlertCircle
} from 'lucide-react'

interface AccountingStats {
  overview: {
    totalSales: number
    totalRevenue: number
    totalCosts: number
    totalMargins: number
    netProfit: number
    profitMargin: number
  }
  salesByCategory: Array<{
    category: string
    count: number
    total: number
  }>
  salesByPeriod: Array<{
    period: string
    count: number
    revenue: number
    margin: number
  }>
  topProducts: Array<{
    productId: string
    productName: string
    count: number
    revenue: number
    margin: number
  }>
  recentEntries: Array<{
    entryNumber: string
    entryType: string
    amount: number
    category: string
    transactionDate: string
    productName?: string
    clientName?: string
  }>
}

export default function AccountingDashboard() {
  const [stats, setStats] = useState<AccountingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadStats()
  }, [period, dateRange])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        period,
        startDate: dateRange.start,
        endDate: dateRange.end
      })
      const response = await fetch(`/api/accounting/stats?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Comptabilité Automatisée
          </h2>
          <button
            onClick={loadStats}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Période:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="year">Année</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Du:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Au:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Ventes totales</span>
            <Package className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.overview.totalSales}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Revenus totaux</span>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.overview.totalRevenue)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Coûts totaux</span>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.overview.totalCosts)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Bénéfice net</span>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(stats.overview.netProfit)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Marge: {stats.overview.profitMargin.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Courbe des ventes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <LineChart className="h-5 w-5 text-emerald-600" />
          Courbe des ventes
        </h3>
        <div className="space-y-4">
          {stats.salesByPeriod.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune donnée pour cette période</p>
          ) : (
            <div className="space-y-3">
              {stats.salesByPeriod.map((item) => (
                <div key={item.period} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">{item.period}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="bg-emerald-500 h-6 rounded"
                        style={{
                          width: `${Math.min(100, (item.revenue / Math.max(...stats.salesByPeriod.map(s => s.revenue))) * 100)}%`
                        }}
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.count} vente{item.count > 1 ? 's' : ''} • Marge: {formatCurrency(item.margin)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ventes par catégorie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            Ventes par catégorie
          </h3>
          <div className="space-y-3">
            {stats.salesByCategory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune catégorie</p>
            ) : (
              stats.salesByCategory.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{item.category}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(item.total / stats.overview.totalRevenue) * 100}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.count} vente{item.count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Top produits
          </h3>
          <div className="space-y-3">
            {stats.topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun produit</p>
            ) : (
              stats.topProducts.map((item, index) => (
                <div key={item.productId} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-emerald-600">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.count} vente{item.count > 1 ? 's' : ''} • {formatCurrency(item.revenue)}
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold mt-1">
                      Marge: {formatCurrency(item.margin)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dernières entrées */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Dernières entrées comptables
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-600 font-medium">N°</th>
                <th className="text-left py-2 px-3 text-gray-600 font-medium">Type</th>
                <th className="text-left py-2 px-3 text-gray-600 font-medium">Produit/Client</th>
                <th className="text-left py-2 px-3 text-gray-600 font-medium">Catégorie</th>
                <th className="text-right py-2 px-3 text-gray-600 font-medium">Montant</th>
                <th className="text-left py-2 px-3 text-gray-600 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Aucune entrée récente
                  </td>
                </tr>
              ) : (
                stats.recentEntries.map((entry) => (
                  <tr key={entry.entryNumber} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">{entry.entryNumber}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        entry.entryType === 'sale' ? 'bg-green-100 text-green-700' :
                        entry.entryType === 'margin' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-xs">
                        {entry.productName && <div className="font-medium">{entry.productName}</div>}
                        {entry.clientName && <div className="text-gray-500">{entry.clientName}</div>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{entry.category}</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{formatDate(entry.transactionDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

