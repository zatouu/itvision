'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import TechApp from '@/components/tech/TechApp'

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
            if (role === 'ADMIN' || role === 'SUPER_ADMIN') router.push('/admin')
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
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-700" />
          <p className="text-sm text-stone-500">Ouverture de votre espace technicien…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirection en cours
  }

  return <TechApp />
}