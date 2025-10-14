import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'

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

// Stockage temporaire en mémoire (en production, utiliser Redis ou base de données)
let notifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'all', // notification pour tous les admins
    type: 'warning',
    title: 'Maintenance programmée',
    message: '3 équipements nécessitent une maintenance cette semaine',
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl: '/admin-reports',
    metadata: { count: 3, type: 'maintenance' }
  },
  {
    id: 'notif-2',
    userId: 'all',
    type: 'info',
    title: 'Nouveau rapport',
    message: 'Un nouveau rapport d\'intervention a été soumis par Moussa Diop',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actionUrl: '/validation-rapports',
    metadata: { technicianId: 'TECH-001', reportId: 'RPT-001' }
  },
  {
    id: 'notif-3',
    userId: 'all',
    type: 'success',
    title: 'Projet terminé',
    message: 'Le projet "Vidéosurveillance Siège" a été marqué comme terminé',
    read: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    actionUrl: '/gestion-projets',
    metadata: { projectId: 'PRJ-001', status: 'completed' }
  },
  {
    id: 'notif-4',
    userId: 'all',
    type: 'error',
    title: 'Problème technique',
    message: 'Problème détecté sur le projet "Domotique Hôtel" - intervention requise',
    read: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    actionUrl: '/gestion-projets',
    metadata: { projectId: 'PRJ-005', severity: 'high' }
  }
]

function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  return decoded
}

// GET - Récupérer les notifications
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Filtrer les notifications pour l'utilisateur
    let userNotifications = notifications.filter(n => 
      n.userId === user.userId || n.userId === 'all' || 
      (user.role === 'ADMIN' && n.userId === 'admin')
    )

    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read)
    }

    // Trier par date (plus récent en premier)
    userNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Limiter le nombre de résultats
    userNotifications = userNotifications.slice(0, limit)

    const unreadCount = notifications.filter(n => 
      (n.userId === user.userId || n.userId === 'all' || (user.role === 'ADMIN' && n.userId === 'admin')) && 
      !n.read
    ).length

    return NextResponse.json({
      success: true,
      notifications: userNotifications,
      unreadCount,
      total: userNotifications.length
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST - Créer une nouvelle notification
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    
    // Seuls les admins peuvent créer des notifications
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, type, title, message, actionUrl, metadata } = body

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Type, titre et message requis' }, { status: 400 })
    }

    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: userId || 'all',
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl,
      metadata
    }

    notifications.unshift(notification)

    // Garder seulement les 100 dernières notifications
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100)
    }

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification créée avec succès'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// PATCH - Marquer des notifications comme lues
export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const body = await request.json()
    const { notificationIds, markAllAsRead } = body

    if (markAllAsRead) {
      // Marquer toutes les notifications de l'utilisateur comme lues
      notifications = notifications.map(n => {
        if (n.userId === user.userId || n.userId === 'all' || (user.role === 'ADMIN' && n.userId === 'admin')) {
          return { ...n, read: true }
        }
        return n
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Marquer les notifications spécifiées comme lues
      notifications = notifications.map(n => {
        if (notificationIds.includes(n.id) && 
            (n.userId === user.userId || n.userId === 'all' || (user.role === 'ADMIN' && n.userId === 'admin'))) {
          return { ...n, read: true }
        }
        return n
      })
    } else {
      return NextResponse.json({ error: 'IDs de notifications ou markAllAsRead requis' }, { status: 400 })
    }

    const unreadCount = notifications.filter(n => 
      (n.userId === user.userId || n.userId === 'all' || (user.role === 'ADMIN' && n.userId === 'admin')) && 
      !n.read
    ).length

    return NextResponse.json({
      success: true,
      unreadCount,
      message: 'Notifications marquées comme lues'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE - Supprimer des notifications
export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    if (deleteAll) {
      // Supprimer toutes les notifications de l'utilisateur
      const initialLength = notifications.length
      notifications = notifications.filter(n => 
        !(n.userId === user.userId || n.userId === 'all' || (user.role === 'ADMIN' && n.userId === 'admin'))
      )
      const deletedCount = initialLength - notifications.length

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `${deletedCount} notifications supprimées`
      })
    } else if (notificationId) {
      // Supprimer une notification spécifique
      const initialLength = notifications.length
      notifications = notifications.filter(n => 
        !(n.id === notificationId && 
          (n.userId === user.userId || n.userId === 'all' || (user.role === 'ADMIN' && n.userId === 'admin')))
      )

      if (notifications.length < initialLength) {
        return NextResponse.json({
          success: true,
          message: 'Notification supprimée'
        })
      } else {
        return NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: 'ID de notification ou paramètre "all" requis' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}