'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminPageWrapper from '@/components/admin/AdminPageWrapper'
import AdminProductManager from '@/components/AdminProductManager'
import AdminTabs from '@/components/admin/AdminTabs'
import { AlertCircle } from 'lucide-react'

export default function AdminProduitsPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          credentials: 'include'
        })
        if (!response.ok) {
          router.push('/login')
          return
        }
        const data = await response.json()
        const role = String(data.user?.role || '').toUpperCase()
        setAllowed(role === 'ADMIN' || role === 'PRODUCT_MANAGER')
      } catch {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  if (allowed === null) {
    return (
      <AdminPageWrapper>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
        </div>
      </AdminPageWrapper>
    )
  }

  if (!allowed) {
    return (
      <AdminPageWrapper>
        <div className="max-w-3xl mx-auto text-center bg-white p-8 rounded-xl border">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Accès refusé</h2>
          <p className="text-gray-600">Cette section est réservée aux administrateurs et gestionnaires produits.</p>
        </div>
      </AdminPageWrapper>
    )
  }

  return (
    <AdminPageWrapper>
      <div className="mb-4">
        <AdminTabs context="services" />
      </div>
      <section>
        <AdminProductManager />
      </section>
    </AdminPageWrapper>
  )
}


