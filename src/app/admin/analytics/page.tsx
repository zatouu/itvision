'use client'

import AdminSidebar from '@/components/admin/AdminSidebar'
import VisitsAnalytics from '@/components/admin/VisitsAnalytics'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Loader2 } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isLoading } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirect en cours via le hook
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Statistiques</h1>
            <p className="text-gray-600 mt-2">Analysez le trafic et les performances de votre site</p>
          </div>
          <VisitsAnalytics />
        </div>
      </main>
    </div>
  )
}

