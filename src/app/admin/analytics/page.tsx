'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import VisitsAnalytics from '@/components/admin/VisitsAnalytics'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-flex items-center gap-2"
          >
            ← Retour au dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Statistiques</h1>
          <p className="text-gray-600 mt-2">Analysez le trafic et les performances de votre site</p>
        </div>
        <VisitsAnalytics />
      </main>
      <Footer />
    </div>
  )
}

