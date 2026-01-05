'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseCsrfReturn {
  csrfToken: string | null
  isLoading: boolean
  error: string | null
  refreshToken: () => Promise<string | null>
  fetchWithCsrf: (url: string, options?: RequestInit) => Promise<Response>
}

/**
 * Hook pour gérer les tokens CSRF
 * Récupère automatiquement un token CSRF et le fournit pour les requêtes
 */
export function useCsrf(): UseCsrfReturn {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const token = data.csrfToken || response.headers.get('X-CSRF-Token')
        setCsrfToken(token)
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
    // S'assurer qu'on a un token
    let token = csrfToken
    if (!token) {
      token = await fetchToken()
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }

    if (token) {
      headers['X-CSRF-Token'] = token
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })
  }, [csrfToken, fetchToken])

  return {
    csrfToken,
    isLoading,
    error,
    refreshToken: fetchToken,
    fetchWithCsrf
  }
}
