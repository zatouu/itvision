'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface ProtectedPageProps {
  children: ReactNode
  requiredRole?: string | string[]
  redirectTo?: string
}

/**
 * Composant de protection pour les pages client
 * Affiche un loader pendant la vérification et redirige si non authentifié
 * Note: La vraie protection se fait au niveau du middleware (serveur)
 * Ce composant est une couche supplémentaire pour éviter le flash de contenu
 */
export default function ProtectedPage({ 
  children, 
  requiredRole,
  redirectTo = '/'
}: ProtectedPageProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
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
          const userRole = String(data.user?.role || '').toUpperCase()
          
          if (requiredRole) {
            const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
            const allowedRoles = roles.map(r => r.toUpperCase())
            
            if (allowedRoles.includes(userRole)) {
              setIsAuthorized(true)
            } else {
              router.push(redirectTo)
            }
          } else {
            // Pas de rôle spécifique requis, juste authentifié
            setIsAuthorized(true)
          }
        } else {
          router.push(redirectTo)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push(redirectTo)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, requiredRole, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification d'accès...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // Redirection en cours
  }

  return <>{children}</>
}







