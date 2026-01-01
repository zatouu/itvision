'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SessionCheckOptions {
  /** Intervalle de vérification en ms (défaut: 60000 = 1 minute) */
  checkInterval?: number
  /** Délai d'inactivité avant déconnexion en ms (défaut: 30 minutes) */
  inactivityTimeout?: number
  /** Callback appelé avant la déconnexion */
  onSessionExpiring?: () => void
  /** Callback appelé après la déconnexion */
  onSessionExpired?: () => void
  /** Activer le suivi d'activité utilisateur */
  trackActivity?: boolean
}

export function useSessionCheck(options: SessionCheckOptions = {}) {
  const {
    checkInterval = 60000, // 1 minute
    inactivityTimeout = 30 * 60 * 1000, // 30 minutes
    onSessionExpiring,
    onSessionExpired,
    trackActivity = true
  } = options

  const router = useRouter()
  const [isSessionValid, setIsSessionValid] = useState(true)
  const [showExpiringWarning, setShowExpiringWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const lastActivityRef = useRef(Date.now())
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Mettre à jour l'activité utilisateur
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowExpiringWarning(false)
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
  }, [])

  // Vérifier la validité du token
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        setIsSessionValid(false)
        onSessionExpired?.()
        router.push('/login?expired=true')
        return false
      }

      // Vérifier l'inactivité
      const timeSinceActivity = Date.now() - lastActivityRef.current
      const timeRemaining = inactivityTimeout - timeSinceActivity

      if (timeSinceActivity >= inactivityTimeout) {
        // Session expirée par inactivité
        setIsSessionValid(false)
        onSessionExpired?.()
        
        // Supprimer le cookie côté client
        document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        
        router.push('/login?expired=inactivity')
        return false
      }

      // Avertir 5 minutes avant l'expiration
      if (timeRemaining <= 5 * 60 * 1000 && timeRemaining > 0) {
        setShowExpiringWarning(true)
        setRemainingTime(Math.ceil(timeRemaining / 1000 / 60))
        onSessionExpiring?.()
      } else {
        setShowExpiringWarning(false)
      }

      setIsSessionValid(true)
      return true
    } catch (error) {
      console.error('Erreur vérification session:', error)
      return true // Ne pas déconnecter en cas d'erreur réseau temporaire
    }
  }, [router, inactivityTimeout, onSessionExpired, onSessionExpiring])

  // Prolonger la session (reset inactivité)
  const extendSession = useCallback(() => {
    updateActivity()
    setShowExpiringWarning(false)
  }, [updateActivity])

  // Déconnecter manuellement
  const logout = useCallback(() => {
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/login')
  }, [router])

  // Initialisation
  useEffect(() => {
    // Vérification initiale
    checkSession()

    // Vérification périodique
    checkIntervalRef.current = setInterval(checkSession, checkInterval)

    // Suivi d'activité utilisateur
    if (trackActivity) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
      events.forEach(event => {
        window.addEventListener(event, updateActivity, { passive: true })
      })

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, updateActivity)
        })
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
        }
      }
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [checkInterval, checkSession, trackActivity, updateActivity])

  return {
    isSessionValid,
    showExpiringWarning,
    remainingTime,
    extendSession,
    logout,
    checkSession
  }
}

export default useSessionCheck
