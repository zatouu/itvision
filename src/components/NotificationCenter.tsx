'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  Settings,
  RefreshCw
} from 'lucide-react'

interface Notification {
  id: string
  userId: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  metadata?: any
}

interface NotificationCenterProps {
  className?: string
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Charger les notifications
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications')
      const data = await response.json()

      if (data.success) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
        setError('')
      } else {
        setError(data.error || 'Erreur lors du chargement')
      }
    } catch (error) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // Marquer comme lu
  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      const data = await response.json()
      if (data.success) {
        setUnreadCount(data.unreadCount)
        setNotifications(prev => prev.map(n => 
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        ))
      }
    } catch (error) {
      console.error('Erreur lors du marquage:', error)
    }
  }

  // Marquer tout comme lu
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })

      const data = await response.json()
      if (data.success) {
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
    } catch (error) {
      console.error('Erreur lors du marquage:', error)
    }
  }

  // Supprimer une notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Recalculer le nombre de non lues
        const newUnreadCount = notifications.filter(n => n.id !== notificationId && !n.read).length
        setUnreadCount(newUnreadCount)
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  // Charger les notifications au montage et périodiquement
  useEffect(() => {
    fetchNotifications()
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getNotificationBgColor = (type: string, read: boolean) => {
    const opacity = read ? '50' : '100'
    switch (type) {
      case 'success': return `bg-green-${opacity}`
      case 'warning': return `bg-yellow-${opacity}`
      case 'error': return `bg-red-${opacity}`
      default: return `bg-blue-${opacity}`
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'À l\'instant'
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Il y a ${diffInHours}h`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `Il y a ${diffInDays}j`
    
    return date.toLocaleDateString('fr-FR')
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bouton de notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notifications */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {unreadCount} nouvelles
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchNotifications}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Actualiser"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Tout marquer comme lu"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Chargement...</p>
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <XCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    onClick={fetchNotifications}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Réessayer
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                !notification.read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                              <p className={`text-sm mt-1 ${
                                !notification.read ? 'text-gray-700' : 'text-gray-500'
                              }`}>
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                                
                                <div className="flex items-center space-x-2">
                                  {!notification.read && (
                                    <button
                                      onClick={() => markAsRead([notification.id])}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                      title="Marquer comme lu"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                  )}
                                  
                                  {notification.actionUrl && (
                                    <a
                                      href={notification.actionUrl}
                                      onClick={() => setIsOpen(false)}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                      title="Voir détails"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  
                                  <button
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <a
                  href="/client-portal"
                  onClick={() => setIsOpen(false)}
                  className="w-full block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Voir toutes les notifications
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}