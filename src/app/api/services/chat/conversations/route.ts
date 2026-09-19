import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import mongoose from 'mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import ChatMessage from '@/lib/models/ChatMessage'
import User from '@/lib/models/User'
import ProviderProfile from '@/lib/models/ProviderProfile'
import { verifyAuthServer } from '@/lib/auth-server'

/**
 * GET /api/services/chat/conversations — inbox "Messages".
 * Une conversation = une mission avec prestataire assigné (le chat n'existe
 * qu'entre client et prestataire assigné). Tri par dernier message.
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.user.id

    // Missions avec un prestataire assigné (actives + terminées récentes)
    const recentCutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 jours
    const requests = await ServiceRequest.find({
      $or: [{ clientId: userId }, { assignedProviderId: userId }],
      assignedProviderId: { $exists: true, $ne: null },
      $and: [
        { status: { $nin: ['cancelled', 'expired', 'archived'] } },
        { $or: [{ status: { $ne: 'completed' } }, { completedAt: { $gte: recentCutoff } }] },
      ],
    })
      .select('clientId assignedProviderId category status description createdAt updatedAt clientChatReadAt providerChatReadAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean() as any[]

    if (requests.length === 0) return NextResponse.json({ items: [] })

    const requestIds = requests.map(r => r._id)

    // Dernier message + candidats non lus par conversation (2 aggregations)
    const [lastMsgs, unreadAgg] = await Promise.all([
      ChatMessage.aggregate([
        { $match: { requestId: { $in: requestIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$requestId', last: { $first: '$$ROOT' } } },
      ]),
      ChatMessage.aggregate([
        { $match: { requestId: { $in: requestIds }, senderId: { $ne: String(userId) } } },
        { $group: { _id: '$requestId', dates: { $push: '$createdAt' } } },
      ]),
    ])

    const lastByReq = new Map(lastMsgs.map((m: any) => [String(m._id), m.last]))
    const unreadDatesByReq = new Map(unreadAgg.map((u: any) => [String(u._id), u.dates as Date[]]))

    // Infos de l'autre partie (client ↔ prestataire)
    const otherIds = requests.map(r =>
      String(r.clientId) === String(userId) ? String(r.assignedProviderId) : String(r.clientId)
    )
    const uniqueOtherIds = [...new Set(otherIds)]
    const objectIds = uniqueOtherIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id))
    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: objectIds } }).select('_id name avatarUrl kycVerified').lean() as Promise<any[]>,
      ProviderProfile.find({ userId: { $in: uniqueOtherIds } }).select('userId kycVerified serviceCategories').lean() as Promise<any[]>,
    ])
    const userMap = new Map(users.map(u => [String(u._id), u]))
    const profileMap = new Map(profiles.map(p => [String(p.userId), p]))

    const items = requests.map(r => {
      const iAmClient = String(r.clientId) === String(userId)
      const otherId = iAmClient ? String(r.assignedProviderId) : String(r.clientId)
      const other = userMap.get(otherId)
      const otherProfile = profileMap.get(otherId)
      const last = lastByReq.get(String(r._id))
      const readAt = iAmClient ? r.clientChatReadAt : r.providerChatReadAt
      const readAtMs = readAt ? new Date(readAt).getTime() : 0
      const unreadDates = unreadDatesByReq.get(String(r._id)) || []
      const unreadCount = unreadDates.filter(d => new Date(d).getTime() > readAtMs).length

      return {
        requestId: String(r._id),
        category: r.category,
        status: r.status,
        description: (r.description || '').slice(0, 80),
        otherParty: {
          id: otherId,
          name: other?.name || (iAmClient ? 'Prestataire' : 'Client'),
          avatarUrl: other?.avatarUrl || '',
          verified: !!(other?.kycVerified || otherProfile?.kycVerified),
          trade: iAmClient ? (otherProfile?.serviceCategories?.[0] || r.category) : undefined,
        },
        lastMessage: last
          ? { text: last.text, createdAt: last.createdAt, senderRole: last.senderRole, mine: String(last.senderId) === String(userId) }
          : null,
        unreadCount,
        updatedAt: last?.createdAt || r.updatedAt,
      }
    })

    // Tri : dernier message d'abord, sinon activité de la demande
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return NextResponse.json({
      items,
      totalUnread: items.reduce((sum, it) => sum + it.unreadCount, 0),
    })
  } catch (e: any) {
    console.error('[GET /api/services/chat/conversations]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
