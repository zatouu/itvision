'use client'

import { useState, useEffect } from 'react'
import { useSecureSession } from '@/hooks/useSecureSession'
import { AlertTriangle, Shield, Clock, X } from 'lucide-react'

export default function SecurityNotifications() {
  const { security, timeRemaining, shouldWarn, refreshSession } = useSecureSession()
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'warning' | 'error' | 'info'
    title: string
    message: string
    action?: () => void
    actionLabel?: string
  }>>([])

  // Gérer les notifications de session
  useEffect(() => {
    const newNotifications = []

    // Avertissement d'expiration de session
    if (shouldWarn && timeRemaining > 0) {
      const minutes = Math.floor(timeRemaining / 60)
      newNotifications.push({
        id: 'session-expiry',
        type: 'warning' as const,
        title: 'Session expire bientôt',
        message: `Votre session expire dans ${minutes} minute${minutes > 1 ? 's' : ''}`,
        action: refreshSession,
        actionLabel: 'Prolonger'
      })
    }

    // Détection de changement d'appareil
    if (typeof window !== 'undefined') {
      const deviceChanged = localStorage.getItem('device_change_detected')
      if (deviceChanged && !notifications.find(n => n.id === 'device-change')) {
        newNotifications.push({
          id: 'device-change',
          type: 'error' as const,
          title: 'Changement d\'appareil détecté',
          message: 'Votre session a été utilisée depuis un autre appareil',
          action: () => {
            localStorage.removeItem('device_change_detected')
            window.location.href = '/login'
          },
          actionLabel: 'Se reconnecter'
        })
      }
    }

    setNotifications(newNotifications)
  }, [shouldWarn, timeRemaining, refreshSession, notifications])

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            max-w-sm p-4 rounded-lg shadow-lg border-l-4 bg-white
            ${notification.type === 'error' ? 'border-red-500' : ''}
            ${notification.type === 'warning' ? 'border-yellow-500' : ''}
            ${notification.type === 'info' ? 'border-blue-500' : ''}
          `}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'error' && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              {notification.type === 'warning' && (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              {notification.type === 'info' && (
                <Shield className="h-5 w-5 text-blue-500" />
              )}
            </div>
            
            <div className="ml-3 flex-1">
              <h3 className={`
                text-sm font-medium
                ${notification.type === 'error' ? 'text-red-800' : ''}
                ${notification.type === 'warning' ? 'text-yellow-800' : ''}
                ${notification.type === 'info' ? 'text-blue-800' : ''}
              `}>
                {notification.title}
              </h3>
              <p className={`
                mt-1 text-sm
                ${notification.type === 'error' ? 'text-red-700' : ''}
                ${notification.type === 'warning' ? 'text-yellow-700' : ''}
                ${notification.type === 'info' ? 'text-blue-700' : ''}
              `}>
                {notification.message}
              </p>
              
              {notification.action && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={notification.action}
                    className={`
                      text-sm font-medium px-3 py-1 rounded
                      ${notification.type === 'error' ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''}
                      ${notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
                      ${notification.type === 'info' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : ''}
                    `}
                  >
                    {notification.actionLabel}
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => dismissNotification(notification.id)}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Composant de statut de sécurité pour la barre d'administration
export function SecurityStatus() {
  const { security, isAuthenticated } = useSecureSession()
  
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <Shield className={`h-4 w-4 ${security.isValid ? 'text-green-500' : 'text-red-500'}`} />
      <span className={security.isValid ? 'text-green-600' : 'text-red-600'}>
        {security.isValid ? 'Sécurisé' : 'Session invalide'}
      </span>
      {security.isValid && (
        <span className="text-gray-500">
          • {Math.floor(security.timeRemaining / 60)}min restantes
        </span>
      )}
    </div>
  )
}