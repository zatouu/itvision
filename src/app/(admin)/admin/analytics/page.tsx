'use client'

import VisitsAnalytics from '@/components/admin/VisitsAnalytics'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Loader2 } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isLoading } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-stone-600">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirect en cours via le hook
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-900">Analytics & Statistiques</h1>
        <p className="text-stone-600 mt-2">Analysez le trafic et les performances de votre site</p>
      </div>
      <VisitsAnalytics />
    </div>
  )
}
