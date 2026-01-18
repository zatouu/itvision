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
          console.log('Tech auth check result:', data) // Debug log
          
          const role = String(data.user?.role || '').toUpperCase()
          if (role === 'TECHNICIAN') {
            setIsAuthenticated(true)
          } else {
            console.log('Tech auth failed - wrong role:', role) // Debug log
            // Redirection selon le rôle
            if (role === 'ADMIN') router.push('/admin')
            else if (role === 'CLIENT') router.push('/compte')
            else router.push('/login')
          }
        } else {
          console.log('Tech auth check failed, redirecting to login') // Debug log
          router.push('/login')
        }
      } catch (error) {
        console.error('Tech auth check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification d'accès technicien...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirection en cours
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb 
          backHref="/" 
          backLabel="Retour à l'accueil"
        />
      </div>
      <TechnicianPortal />
    </div>
  )
}