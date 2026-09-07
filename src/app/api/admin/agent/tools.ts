import { Types } from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { Order } from '@/lib/models/Order'
import User from '@/lib/models/User'
import KycRequest from '@/lib/models/KycRequest'
import InAppNotification from '@/lib/models/InAppNotification'
import type { AgentToolDefinition } from '@/lib/ai/agent'

export const adminAgentTools: AgentToolDefinition[] = [
  {
    name: 'getOrders',
    description: 'Liste les commandes avec filtres (statut, limit, clientName, orderId). Retourne un résumé.',
    readOnly: true,
    parameters: {
      status: { type: 'string', description: "statut de commande : pending, confirmed, processing, shipped, delivered, cancelled (optionnel)", enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
      limit: { type: 'number', description: 'nombre maximum de résultats (défaut 10, max 50)' },
      clientName: { type: 'string', description: 'fragment du nom du client (optionnel)' },
      orderId: { type: 'string', description: 'référence exacte de commande (optionnel)' },
    },
  },
  {
    name: 'getOrderDetails',
    description: 'Retourne les détails complets d\'une commande par orderId.',
    readOnly: true,
    parameters: {
      orderId: { type: 'string', description: 'référence exacte de commande CMD-...' },
    },
  },
  {
    name: 'updateOrderStatus',
    description: 'Met à jour le statut d\'une commande. Nécessite confirmation.',
    readOnly: false,
    parameters: {
      orderId: { type: 'string', description: 'référence exacte de commande CMD-...' },
      status: { type: 'string', description: 'nouveau statut', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
      trackingNumber: { type: 'string', description: 'numéro de suivi transporteur (si shipped)' },
      trackingUrl: { type: 'string', description: 'URL de suivi transporteur (si shipped)' },
      internalNotes: { type: 'string', description: 'note interne optionnelle' },
    },
  },
  {
    name: 'getAdminStats',
    description: 'Agrège les statistiques clés de la plateforme : commandes, utilisateurs, KYC en attente, etc.',
    readOnly: true,
    parameters: {},
  },
  {
    name: 'getPendingKyc',
    description: 'Liste les demandes KYC en attente de validation (provider, vendor, client).',
    readOnly: true,
    parameters: {
      limit: { type: 'number', description: 'nombre maximum (défaut 10, max 50)' },
      status: { type: 'string', description: 'statut filtre', enum: ['pending', 'rejected', 'approved'] },
    },
  },
  {
    name: 'searchUsers',
    description: 'Recherche des utilisateurs par nom, email ou téléphone.',
    readOnly: true,
    parameters: {
      query: { type: 'string', description: 'fragment de nom, email ou téléphone' },
      role: { type: 'string', description: 'CLIENT, PROVIDER, VENDOR, ADMIN, SUPER_ADMIN (optionnel)', enum: ['CLIENT', 'PROVIDER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN'] },
      limit: { type: 'number', description: 'nombre maximum (défaut 10)' },
    },
  },
  {
    name: 'sendNotification',
    description: 'Envoie une notification in-app à un utilisateur. Nécessite confirmation.',
    readOnly: false,
    parameters: {
      userId: { type: 'string', description: 'identifiant utilisateur' },
      title: { type: 'string', description: 'titre de la notification' },
      message: { type: 'string', description: 'corps de la notification' },
      type: { type: 'string', description: 'info, success, warning, error', enum: ['info', 'success', 'warning', 'error'] },
      actionUrl: { type: 'string', description: 'lien action optionnel' },
    },
  },
]

function asNumber(value: unknown, fallback = 10, max = 50): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

export const adminAgentHandlers: Record<string, any> = {
  async getOrders(args: Record<string, unknown>) {
    await connectMongoose()
    const limit = asNumber(args.limit, 10, 50)
    const filter: Record<string, any> = {}
    if (args.status && typeof args.status === 'string') filter.status = args.status
    if (args.clientName && typeof args.clientName === 'string') {
      filter.clientName = { $regex: args.clientName, $options: 'i' }
    }
    if (args.orderId && typeof args.orderId === 'string') filter.orderId = args.orderId

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return orders.map((o: any) => ({
      orderId: o.orderId,
      clientName: o.clientName,
      clientPhone: o.clientPhone,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: o.total,
      createdAt: o.createdAt,
    }))
  },

  async getOrderDetails(args: Record<string, unknown>) {
    await connectMongoose()
    const orderId = String(args.orderId || '')
    if (!orderId) throw new Error('orderId requis')
    const order = await Order.findOne({ orderId }).lean() as any
    if (!order) throw new Error('Commande introuvable')
    return order
  },

  async updateOrderStatus(args: Record<string, unknown>, confirmed: boolean, caller: { userId: string }) {
    if (!confirmed) throw new Error('Confirmation requise')
    await connectMongoose()
    const orderId = String(args.orderId || '')
    const status = String(args.status || '')
    if (!orderId || !status) throw new Error('orderId et status requis')

    const update: Record<string, any> = { status, updatedAt: new Date() }
    if (status === 'confirmed') update.confirmedAt = new Date()
    if (status === 'shipped') update.shippedAt = new Date()
    if (status === 'delivered') update.deliveredAt = new Date()

    if (args.trackingNumber) {
      update['delivery.trackingNumber'] = String(args.trackingNumber)
      if (args.trackingUrl) update['delivery.trackingUrl'] = String(args.trackingUrl)
    }
    if (args.internalNotes && typeof args.internalNotes === 'string') {
      update.internalNotes = args.internalNotes
    }

    const order = await Order.findOneAndUpdate({ orderId }, { $set: update }, { new: true }).lean() as any
    if (!order) throw new Error('Commande introuvable')

    // Audit in-app notification for staff
    await InAppNotification.create({
      roles: ['ADMIN'],
      type: 'success',
      title: 'Mise à jour commande par agent IA',
      message: `Commande ${orderId} passée en "${status}" par l'agent (admin: ${String(caller.userId).slice(0, 24)}).`,
      metadata: { orderId, status, agent: true },
    })

    return { orderId, status, updatedAt: order.updatedAt }
  },

  async getAdminStats() {
    await connectMongoose()
    const [ordersTotal, ordersPending, usersTotal, kycPending] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: 'pending' }),
      User.countDocuments({}),
      KycRequest.countDocuments({ status: 'pending' }),
    ])
    return { ordersTotal, ordersPending, usersTotal, kycPending }
  },

  async getPendingKyc(args: Record<string, unknown>) {
    await connectMongoose()
    const limit = asNumber(args.limit, 10, 50)
    const filter: Record<string, any> = {}
    if (args.status && typeof args.status === 'string') filter.status = args.status
    const requests = await KycRequest.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
    return requests.map((r: any) => ({
      _id: String(r._id),
      userId: r.userId,
      status: r.status,
      createdAt: r.createdAt,
    }))
  },

  async searchUsers(args: Record<string, unknown>) {
    await connectMongoose()
    const query = String(args.query || '')
    const limit = asNumber(args.limit, 10, 50)
    const filter: Record<string, any> = {}
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ]
    }
    if (args.role && typeof args.role === 'string') filter.role = args.role
    const users = await User.find(filter).limit(limit).lean()
    return users.map((u: any) => ({
      _id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
    }))
  },

  async sendNotification(args: Record<string, unknown>, confirmed: boolean, caller: { userId: string }) {
    if (!confirmed) throw new Error('Confirmation requise')
    await connectMongoose()
    const userId = String(args.userId || '')
    const title = String(args.title || '')
    const message = String(args.message || '')
    const type = (args.type as 'info' | 'success' | 'warning' | 'error') || 'info'
    if (!userId || !title || !message) throw new Error('userId, title et message requis')

    if (!Types.ObjectId.isValid(userId)) throw new Error('userId invalide')

    const notif = await InAppNotification.create({
      userId,
      type,
      title,
      message,
      actionUrl: args.actionUrl ? String(args.actionUrl) : undefined,
      metadata: { sentByAgent: true, adminId: caller.userId },
    })

    return { notificationId: String(notif._id), userId, title, type }
  },
}
