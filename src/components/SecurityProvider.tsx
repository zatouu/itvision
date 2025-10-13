'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import SecurityNotifications from './SecurityNotifications'

interface SecurityContextType {
  isSecure: boolean
  threats: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: Date
  }>
  csrfToken: string | null
  deviceFingerprint: string
  refreshSecurity: () => Promise<void>
}

const SecurityContext = createContext<SecurityContextType | null>(null)

export function useSecurityContext() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider')
  }
  return context
}

interface SecurityProviderProps {
  children: ReactNode
}

export default function SecurityProvider({ children }: SecurityProviderProps) {
  const { data: session, status } = useSession()
  const [securityState, setSecurityState] = useState<SecurityContextType>({
    isSecure: false,
    threats: [],
    csrfToken: null,
    deviceFingerprint: '',
    refreshSecurity: async () => {}
  })

  // Générer l'empreinte de l'appareil
  const generateDeviceFingerprint = () => {
    if (typeof window === 'undefined') return ''
    
    try {
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookieEnabled: navigator.cookieEnabled,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        maxTouchPoints: navigator.maxTouchPoints || 0
      }
      
      return btoa(JSON.stringify(fingerprint)).slice(0, 32)
    } catch (error) {
      console.error('Erreur génération empreinte:', error)
      return 'unknown'
    }
  }

  // Obtenir le token CSRF
  const fetchCSRFToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.csrfToken
      }
    } catch (error) {
      console.error('Erreur récupération CSRF:', error)
    }
    return null
  }

  // Détecter les menaces de sécurité
  const detectThreats = (): Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: Date
  }> => {
    const threats: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      timestamp: Date
    }> = []
    
    // Vérifier si l'appareil a changé
    if (typeof window !== 'undefined') {
      const storedFingerprint = localStorage.getItem('device_fingerprint')
      const currentFingerprint = generateDeviceFingerprint()
      
      if (storedFingerprint && storedFingerprint !== currentFingerprint) {
        threats.push({
          type: 'device_change',
          severity: 'high' as const,
          message: 'Changement d\'appareil détecté',
          timestamp: new Date()
        })
      }
      
      // Stocker l'empreinte actuelle
      localStorage.setItem('device_fingerprint', currentFingerprint)
    }

    // Vérifier l'intégrité de la session
    if (session && status === 'authenticated') {
      const sessionAge = Date.now() - new Date(session.expires || 0).getTime()
      const maxAge = 8 * 60 * 60 * 1000 // 8 heures
      
      if (sessionAge > maxAge * 0.9) { // 90% de la durée
        threats.push({
          type: 'session_expiry',
          severity: 'medium' as const,
          message: 'Session expire bientôt',
          timestamp: new Date()
        })
      }
    }

    return threats
  }

  // Actualiser l'état de sécurité
  const refreshSecurity = async () => {
    try {
      const [csrfToken, threats] = await Promise.all([
        fetchCSRFToken(),
        Promise.resolve(detectThreats())
      ])

      const deviceFingerprint = generateDeviceFingerprint()
      const isSecure = threats.filter(t => t.severity === 'critical').length === 0 && 
                       threats.filter(t => t.severity === 'high').length === 0

      setSecurityState(prev => ({
        ...prev,
        isSecure,
        threats,
        csrfToken,
        deviceFingerprint,
        refreshSecurity
      }))

    } catch (error) {
      console.error('Erreur actualisation sécurité:', error)
      setSecurityState(prev => ({
        ...prev,
        isSecure: false,
        threats: [{
          type: 'security_error',
          severity: 'high',
          message: 'Erreur de vérification de sécurité',
          timestamp: new Date()
        }]
      }))
    }
  }

  // Actualisation automatique
  useEffect(() => {
    refreshSecurity()
    
    // Vérifier la sécurité toutes les 30 secondes
    const interval = setInterval(refreshSecurity, 30000)
    
    return () => clearInterval(interval)
  }, [session, status])

  // Mise à jour de la fonction refreshSecurity dans l'état
  useEffect(() => {
    setSecurityState(prev => ({
      ...prev,
      refreshSecurity
    }))
  }, [])

  return (
    <SecurityContext.Provider value={securityState}>
      {children}
      <SecurityNotifications />
    </SecurityContext.Provider>
  )
}