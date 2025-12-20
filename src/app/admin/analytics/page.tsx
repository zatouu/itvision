'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import VisitsAnalytics from '@/components/admin/VisitsAnalytics'

export default function AdminAnalyticsPage() {
  const router = useRouter()

  useEffect(() => {
    // Vérifier l'authentification
    const token = document.cookie.split('; ').find(row => row.startsWith('auth-token='))
    if (!token) {
      router.push('/login')
    }
  }, [router])

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

