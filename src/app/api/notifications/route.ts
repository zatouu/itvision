import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import InAppNotification from '@/lib/models/InAppNotification'
import { requireAuth } from '@/lib/jwt'
import mongoose from 'mongoose'

async function requireAuthUser(request: NextRequest) {
  return await requireAuth(request)
}

/** Cible visible par l'utilisateur : ses notifs directes + celles de son rôle. */
function visibilityFilter(user: { userId: string; role?: string }) {
  const uid = String(user.userId)
  const role = String(user.role || '').toUpperCase()
  const or: any[] = [{ userId: uid }]
  if (role) or.push({ roles: role })
  // Canal historique « admin » du store mémoire
  if (['ADMIN', 'SUPER_ADMIN'].includes(role)) or.push({ userId: 'admin' })
  return { $or: or, deletedBy: { $ne: uid } }
}

function serialize(n: any, uid: string) {
  return {
    id: String(n._id),
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    read: Array.isArray(n.readBy) && n.readBy.includes(uid),
    createdAt: n.createdAt,
    actionUrl: n.actionUrl,
    metadata: n.metadata,
  }
}

// GET - Notifications persistées (Mongo)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))

    await connectMongoose()
    const filter = visibilityFilter(user)
    const docs = await InAppNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean() as any[]

    const uid = String(user.userId)
    let list = docs.map(d => serialize(d, uid))
    if (unreadOnly) list = list.filter(n => !n.read)
    const unreadCount = docs.filter(d => !(d.readBy || []).includes(uid)).length

    return NextResponse.json({
      success: true,
      notifications: list.slice(0, limit),
      unreadCount,
      total: list.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST - Créer une notification (admins uniquement)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String(user.role).toUpperCase())) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, roles, type, title, message, actionUrl, metadata } = body
    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Type, titre et message requis' }, { status: 400 })
    }

    await connectMongoose()
    const doc = await InAppNotification.create({
      userId: userId || undefined,
      roles: Array.isArray(roles) && roles.length ? roles : undefined,
      type,
      title,
      message,
      actionUrl,
      metadata,
    })

    return NextResponse.json({ success: true, notification: serialize(doc, String(user.userId)) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// PATCH - Marquer comme lues
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = await request.json()
    const { notificationIds, markAllAsRead } = body
    const uid = String(user.userId)

    await connectMongoose()
    const filter = visibilityFilter(user)

    if (markAllAsRead) {
      await InAppNotification.updateMany(filter, { $addToSet: { readBy: uid } })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      const ids = notificationIds.filter((id: string) => mongoose.isValidObjectId(id))
      if (ids.length) {
        await InAppNotification.updateMany(
          { _id: { $in: ids }, ...filter },
          { $addToSet: { readBy: uid } }
        )
      }
    } else {
      return NextResponse.json({ error: 'IDs de notifications ou markAllAsRead requis' }, { status: 400 })
    }

    const remaining = await InAppNotification.countDocuments({ ...filter, readBy: { $ne: uid } })
    return NextResponse.json({ success: true, unreadCount: remaining })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE - Supprimer (soft delete par utilisateur via deletedBy)
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'
    const uid = String(user.userId)

    await connectMongoose()
    const filter = visibilityFilter(user)

    if (deleteAll) {
      const res = await InAppNotification.updateMany(filter, { $addToSet: { deletedBy: uid } })
      return NextResponse.json({ success: true, deletedCount: res.modifiedCount })
    }
    if (notificationId) {
      if (!mongoose.isValidObjectId(notificationId)) {
        return NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 })
      }
      const res = await InAppNotification.updateOne(
        { _id: notificationId, ...filter },
        { $addToSet: { deletedBy: uid } }
      )
      if (!res.matchedCount) {
        return NextResponse.json({ error: 'Notification non trouvée' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'ID de notification ou paramètre "all" requis' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
