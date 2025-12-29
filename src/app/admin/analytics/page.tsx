'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import VisitsAnalytics from '@/components/admin/VisitsAnalytics'
import { BarChart3, AlertCircle, RefreshCw } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = useCallback(async () => {
    try {
      // Vérifier l'authentification via une requête API
      const response = await fetch('/api/admin/analytics/visits?days=1', {
        credentials: 'include'
      })
      
      if (response.status === 401) {
        router.push('/login')
        return
      }
      
      const data = await response.json()
      if (data.success) {
        setIsAuthenticated(true)
      } else if (data.error?.includes('authentifié') || data.error?.includes('autorisé')) {
        router.push('/login')
      } else {
        setIsAuthenticated(true)
      }
    } catch (err) {
      console.error('Erreur vérification auth:', err)
      setError('Erreur de connexion au serveur')
      setIsAuthenticated(false)
    }
  }, [router])

  useEffect(() => {
    // Vérification initiale du cookie
    const token = document.cookie.split('; ').find(row => row.startsWith('auth-token='))
    if (!token) {
      router.push('/login')
      return
    }
    // Vérifier la validité du token via API
    checkAuth()
  }, [router, checkAuth])

  // État de chargement initial
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <BarChart3 className="h-8 w-8 text-emerald-600 animate-pulse" />
            </div>
            <p className="text-gray-600">Chargement des analytics...</p>
          </div>
        </main>
      </div>
    )
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setIsAuthenticated(null)
                checkAuth()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Statistiques</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Analysez le trafic et les performances de votre site</p>
          </div>
          <VisitsAnalytics />
        </div>
      </main>
    </div>
  )
}

