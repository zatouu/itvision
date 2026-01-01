'use client'

import { useEffect, useState } from 'react'
import { useSessionCheck } from '@/hooks/useSessionCheck'
import { Clock, AlertTriangle, RefreshCw, LogOut } from 'lucide-react'

interface SessionManagerProps {
  /** Délai d'inactivité en minutes (défaut: 30) */
  inactivityMinutes?: number
  /** Intervalle de vérification en secondes (défaut: 60) */
  checkIntervalSeconds?: number
}

export default function SessionManager({
  inactivityMinutes = 30,
  checkIntervalSeconds = 60
}: SessionManagerProps) {
  const [mounted, setMounted] = useState(false)
  
  const {
    showExpiringWarning,
    remainingTime,
    extendSession,
    logout
  } = useSessionCheck({
    inactivityTimeout: inactivityMinutes * 60 * 1000,
    checkInterval: checkIntervalSeconds * 1000,
    trackActivity: true
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Afficher l'avertissement de session expirante
  if (showExpiringWarning) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-amber-50 border border-amber-300 rounded-xl shadow-2xl p-5 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900">Session bientôt expirée</h4>
              <p className="text-sm text-amber-700 mt-1">
                Votre session expirera dans <span className="font-bold">{remainingTime} minute{remainingTime && remainingTime > 1 ? 's' : ''}</span> en raison d'inactivité.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={extendSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  Continuer
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
