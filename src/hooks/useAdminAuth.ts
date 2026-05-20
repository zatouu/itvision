'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface AdminUser {
  id: string
  email: string
  name?: string
  role: string
}

interface UseAdminAuthReturn {
  isAuthenticated: boolean
  isLoading: boolean
  user: AdminUser | null
  error: string | null
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

/**
 * Hook robuste pour l'authentification admin
 * Vérifie l'authentification via l'API et gère les redirections
 */
export function useAdminAuth(redirectOnFail = true): UseAdminAuthReturn {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      
      // Vérifier l'authentification via l'API
      const response = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Vérifier que l'utilisateur est bien admin (ADMIN ou SUPER_ADMIN)
        const userRole = data.user?.role?.toUpperCase()
        const adminRoles = ['ADMIN', 'SUPER_ADMIN']
        if (adminRoles.includes(userRole)) {
          setUser({
            id: data.user.id || data.user._id,
            email: data.user.email,
            name: data.user.name,
            role: userRole
          })
          setIsAuthenticated(true)
          return true
        } else {
          // Utilisateur authentifié mais pas admin
          setError('Accès réservé aux administrateurs')
          setIsAuthenticated(false)
          if (redirectOnFail) {
            // Rediriger vers le portail approprié selon le rôle
            if (userRole === 'CLIENT') {
              router.replace('/compte')
            } else if (userRole === 'TECHNICIAN') {
              router.replace('/tech-interface')
            } else if (userRole === 'PRODUCT_MANAGER') {
              router.replace('/admin/products')
            } else if (userRole === 'ACCOUNTANT') {
              router.replace('/admin/accounting')
            } else {
              router.replace('/login')
            }
          }
          return false
        }
      } else {
        // Non authentifié
        setIsAuthenticated(false)
        setUser(null)
        if (redirectOnFail) {
          router.replace('/login')
        }
        return false
      }
    } catch (err) {
      console.error('Auth check error:', err)
      setError('Erreur de vérification d\'authentification')
      setIsAuthenticated(false)
      setUser(null)
      if (redirectOnFail) {
        router.replace('/login')
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }, [router, redirectOnFail])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/login', {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsAuthenticated(false)
      setUser(null)
      router.replace('/login')
    }
  }, [router])

  // Vérification initiale
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Vérification périodique (toutes les 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      checkAuth()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated, checkAuth])

  // Écouter les événements de visibilité pour revérifier l'auth quand l'onglet redevient actif
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        checkAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isAuthenticated, checkAuth])

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    logout,
    checkAuth
  }
}
