import { NextRequest, NextResponse } from 'next/server'
import {
  addNotification,
  getNotifications,
  markAllAsReadFor,
  markAsRead,
  deleteById,
  deleteAllFor
} from '@/lib/notifications-memory'
import { requireAuth } from '@/lib/jwt'

async function requireAuthUser(request: NextRequest) {
  return await requireAuth(request)
}

// GET - Récupérer les notifications
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Filtrer strictement par utilisateur (et canal admin dédié)
    const targets = new Set<string>([String(user.userId)])
    if (String(user.role).toUpperCase() === 'ADMIN') targets.add('admin')

    const notifications = getNotifications()
    let userNotifications = notifications.filter(n => targets.has(n.userId))

    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read)
    }

    // Trier par date (plus récent en premier)
    userNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Limiter le nombre de résultats
    userNotifications = userNotifications.slice(0, limit)

    const unreadCount = notifications.filter(n => targets.has(n.userId) && !n.read).length

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
    const user = await requireAuthUser(request)
    
    // Seuls les admins peuvent créer des notifications
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, type, title, message, actionUrl, metadata } = body

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Type, titre et message requis' }, { status: 400 })
    }

    const notification = addNotification({
      userId: userId || 'all',
      type,
      title,
      message,
      actionUrl,
      metadata
    })

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
    const user = await requireAuthUser(request)
    const body = await request.json()
    const { notificationIds, markAllAsRead } = body

    if (markAllAsRead) {
      // Marquer toutes les notifications de l'utilisateur comme lues
      const targets = new Set<string>([String(user.userId)])
      if (String(user.role).toUpperCase() === 'ADMIN') targets.add('admin')
      markAllAsReadFor(targets)
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Marquer les notifications spécifiées comme lues
      const targets = new Set<string>([String(user.userId)])
      if (String(user.role).toUpperCase() === 'ADMIN') targets.add('admin')
      markAsRead(notificationIds, targets)
    } else {
      return NextResponse.json({ error: 'IDs de notifications ou markAllAsRead requis' }, { status: 400 })
    }

    const targets = new Set<string>([String(user.userId)])
    if (String(user.role).toUpperCase() === 'ADMIN') targets.add('admin')
    const unreadCount = getNotifications().filter(n => targets.has(n.userId) && !n.read).length

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
    const user = await requireAuthUser(request)
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    if (deleteAll) {
      // Supprimer toutes les notifications de l'utilisateur
      const targets = new Set<string>([String(user.userId)])
      if (String(user.role).toUpperCase() === 'ADMIN') targets.add('admin')
      const deletedCount = deleteAllFor(targets)

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `${deletedCount} notifications supprimées`
      })
    } else if (notificationId) {
      // Supprimer une notification spécifique
      const targets = new Set<string>([String(user.userId)])
      if (String(user.role).toUpperCase() === 'ADMIN') targets.add('admin')
      const deleted = deleteById(notificationId, targets)

      if (deleted) {
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