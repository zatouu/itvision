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
      // Vérifier l'authentification via l'API auth
      const authResponse = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!authResponse.ok) {
        router.push('/login')
        return
      }
      
      const authData = await authResponse.json()
      
      // Vérifier que l'utilisateur est admin
      if (authData.user?.role?.toUpperCase() !== 'ADMIN') {
        setError('Accès réservé aux administrateurs')
        return
      }
      
      setIsAuthenticated(true)
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
  if (isAuthenticated === null && !error) {
    return (
      <div className="h-screen flex overflow-hidden bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center overflow-hidden">
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
      <div className="h-screen flex overflow-hidden bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur d'accès</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setError(null)
                  setIsAuthenticated(null)
                  checkAuth()
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20">
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

