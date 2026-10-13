'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface SessionSecurity {
  isValid: boolean
  timeRemaining: number
  warningThreshold: number
  csrfToken: string | null
  deviceFingerprint: string
}

export function useSecureSession() {
  const { data: session, status } = useSession()
  const [security, setSecurity] = useState<SessionSecurity>({
    isValid: false,
    timeRemaining: 0,
    warningThreshold: 5 * 60, // 5 minutes
    csrfToken: null,
    deviceFingerprint: ''
  })

  // Générer une empreinte d'appareil
  const generateDeviceFingerprint = useCallback(() => {
    if (typeof window === 'undefined') return ''
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    }
    
    return btoa(JSON.stringify(fingerprint)).slice(0, 32)
  }, [])

  // Obtenir le token CSRF
  const fetchCSRFToken = useCallback(async () => {
    try {
      const response = await fetch('/api/csrf')
      const data = await response.json()
      return data.csrfToken
    } catch (error) {
      console.error('Erreur récupération CSRF token:', error)
      return null
    }
  }, [])

  // Vérifier la validité de la session
  const validateSession = useCallback(async () => {
    if (status !== 'authenticated' || !session) {
      setSecurity(prev => ({ ...prev, isValid: false }))
      return
    }

    try {
      // Calculer le temps restant (estimation basée sur l'âge du token)
      const tokenAge = Date.now() - (session.expires ? new Date(session.expires).getTime() - 8 * 60 * 60 * 1000 : 0)
      const maxAge = 8 * 60 * 60 * 1000 // 8 heures
      const remaining = Math.max(0, maxAge - tokenAge)

      // Obtenir le token CSRF
      const csrfToken = await fetchCSRFToken()
      const deviceFingerprint = generateDeviceFingerprint()

      setSecurity({
        isValid: true,
        timeRemaining: Math.floor(remaining / 1000),
        warningThreshold: 5 * 60,
        csrfToken,
        deviceFingerprint
      })

      // Stocker l'empreinte dans le localStorage pour vérification
      if (typeof window !== 'undefined') {
        localStorage.setItem('device_fingerprint', deviceFingerprint)
      }

    } catch (error) {
      console.error('Erreur validation session:', error)
      setSecurity(prev => ({ ...prev, isValid: false }))
    }
  }, [session, status, fetchCSRFToken, generateDeviceFingerprint])

  // Renouveler la session
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        await validateSession()
        return true
      }
    } catch (error) {
      console.error('Erreur renouvellement session:', error)
    }
    return false
  }, [validateSession])

  // Effectuer une requête sécurisée avec CSRF token
  const secureRequest = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ) => {
    if (!security.csrfToken) {
      throw new Error('Token CSRF non disponible')
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': security.csrfToken,
      'X-Device-Fingerprint': security.deviceFingerprint,
      ...options.headers
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })
  }, [security.csrfToken, security.deviceFingerprint])

  // Détecter les changements d'appareil suspects
  const detectDeviceChange = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    const storedFingerprint = localStorage.getItem('device_fingerprint')
    const currentFingerprint = generateDeviceFingerprint()
    
    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      console.warn('🚨 Changement d\'appareil détecté!')
      return true
    }
    
    return false
  }, [generateDeviceFingerprint])

  // Effet pour validation initiale et monitoring
  useEffect(() => {
    validateSession()
    
    // Vérifier périodiquement la session
    const interval = setInterval(() => {
      validateSession()
      
      // Détecter les changements d'appareil
      if (detectDeviceChange()) {
        // En production, on pourrait forcer une re-authentification
        console.warn('Changement d\'appareil détecté')
      }
    }, 60000) // Toutes les minutes

    return () => clearInterval(interval)
  }, [validateSession, detectDeviceChange])

  // Warning automatique avant expiration
  useEffect(() => {
    if (security.isValid && security.timeRemaining <= security.warningThreshold && security.timeRemaining > 0) {
      console.warn(`⏰ Session expire dans ${Math.floor(security.timeRemaining / 60)} minutes`)
      
      // Ici on pourrait afficher une notification à l'utilisateur
      if (typeof window !== 'undefined') {
        const showWarning = localStorage.getItem('session_warning_shown')
        if (!showWarning) {
          localStorage.setItem('session_warning_shown', 'true')
          // Notification utilisateur (à implémenter selon l'UI)
        }
      }
    }
  }, [security.timeRemaining, security.warningThreshold, security.isValid])

  return {
    session,
    security,
    refreshSession,
    secureRequest,
    isAuthenticated: status === 'authenticated' && security.isValid,
    isLoading: status === 'loading',
    timeRemaining: security.timeRemaining,
    shouldWarn: security.timeRemaining <= security.warningThreshold && security.timeRemaining > 0
  }
}