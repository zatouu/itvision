'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseCsrfReturn {
  csrfToken: string | null
  isLoading: boolean
  error: string | null
  refreshToken: () => Promise<string | null>
  fetchWithCsrf: (url: string, options?: RequestInit) => Promise<Response>
}

/**
 * Hook pour gérer les tokens CSRF avec le pattern double-submit cookie
 * 
 * Note: Pour les routes admin protégées par JWT (/api/admin/*), 
 * le CSRF n'est pas nécessaire car le JWT dans le cookie httpOnly 
 * protège déjà contre les attaques CSRF.
 */
export function useCsrf(): UseCsrfReturn {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      setError(null)
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const token = data.csrfToken
        setCsrfToken(token)
        tokenRef.current = token
        return token
      } else {
        setError('Impossible de récupérer le token CSRF')
        return null
      }
    } catch (err) {
      console.error('Erreur récupération CSRF:', err)
      setError('Erreur réseau lors de la récupération du token CSRF')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Récupérer le token au montage
  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  // Renouveler périodiquement le token (toutes les 30 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchToken()
    }, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchToken])

  // Fonction pour faire une requête avec le token CSRF
  const fetchWithCsrf = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // S'assurer qu'on a un token à jour
    let token = tokenRef.current
    if (!token) {
      token = await fetchToken()
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }

    // Ajouter le token CSRF si disponible
    if (token) {
      headers['X-CSRF-Token'] = token
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })

    // Si on reçoit une erreur 403 CSRF, renouveler le token et réessayer une fois
    if (response.status === 403) {
      const data = await response.clone().json().catch(() => ({}))
      if (data.error?.includes('CSRF')) {
        console.log('Token CSRF expiré, renouvellement...')
        const newToken = await fetchToken()
        if (newToken) {
          headers['X-CSRF-Token'] = newToken
          return fetch(url, {
            ...options,
            headers,
            credentials: 'include'
          })
        }
      }
    }

    return response
  }, [fetchToken])

  return {
    csrfToken,
    isLoading,
    error,
    refreshToken: fetchToken,
    fetchWithCsrf
  }
}
