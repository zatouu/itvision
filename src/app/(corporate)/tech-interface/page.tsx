'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TechnicianPortal from '@/components/TechnicianPortal'
import Breadcrumb from '@/components/Breadcrumb'

export default function TechInterfacePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          const role = String(data.user?.role || '').toUpperCase()
          if (role === 'TECHNICIAN') {
            setIsAuthenticated(true)
          } else {
            // Redirection selon le rôle
            if (role === 'ADMIN') router.push('/admin')
            else if (role === 'CLIENT') router.push('/compte')
            else router.push('/login')
          }
        } else {
          router.push('/login')
        }
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-stone-600">Vérification d'accès technicien...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirection en cours
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/" 
          backLabel="Retour à l'accueil"
        />
      </div>
      {/* Accès rapide : vue terrain mobile-first */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <a href="/tech-interface/terrain"
          className="flex items-center justify-between rounded-2xl bg-emerald-900 text-white px-5 py-4 shadow-md hover:bg-emerald-800 transition-colors">
          <div>
            <p className="text-sm font-bold">Vue terrain</p>
            <p className="text-xs text-emerald-200">Interventions du jour, photos avant/après, signature client</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">Ouvrir →</span>
        </a>
      </div>
      <TechnicianPortal />
    </div>
  )
}