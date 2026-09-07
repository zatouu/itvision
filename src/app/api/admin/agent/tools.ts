import { Types } from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { Order } from '@/lib/models/Order'
import User from '@/lib/models/User'
import KycRequest from '@/lib/models/KycRequest'
import InAppNotification, { type InAppType } from '@/lib/models/InAppNotification'
import { isInternalOrPrivateHost } from '@/lib/ai/qwen'
import { updateOrderStatus, isValidOrderStatus } from '@/lib/market/order-status'
import type { AgentToolDefinition, ToolHandler } from '@/lib/ai/agent'

const USER_ROLES = ['CLIENT', 'TECHNICIAN', 'PRODUCT_MANAGER', 'ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN', 'VENDOR', 'PROVIDER'] as const
const KYC_STATUSES = ['pending', 'approved', 'rejected'] as const

export const adminAgentTools: AgentToolDefinition[] = [
  {
    name: 'getOrders',
    description: 'Liste les commandes avec filtres (statut, limit, clientName, orderId). Retourne un résumé sans données personnelles.',
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
    description: 'Retourne les détails d\'une commande par orderId (données clients sensibles masquées).',
    readOnly: true,
    parameters: {
      orderId: { type: 'string', description: 'référence exacte de commande CMD-...' },
    },
  },
  {
    name: 'updateOrderStatus',
    description: 'Met à jour le statut d\'une commande. Nécessite confirmation. Valide les transitions et exécute les règles métier (stock, grains, notification client).',
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
    description: 'Liste les demandes KYC en attente de validation (provider, vendor, client). Retourne un résumé sans documents sensibles.',
    readOnly: true,
    parameters: {
      limit: { type: 'number', description: 'nombre maximum (défaut 10, max 50)' },
      status: { type: 'string', description: 'statut filtre', enum: ['pending', 'rejected', 'approved'] },
    },
  },
  {
    name: 'searchUsers',
    description: 'Recherche des utilisateurs par nom, email ou téléphone. Retourne un résumé sans email/téléphone.',
    readOnly: true,
    parameters: {
      query: { type: 'string', description: 'fragment de nom, email ou téléphone' },
      role: { type: 'string', description: 'CLIENT, TECHNICIAN, PRODUCT_MANAGER, ACCOUNTANT, ADMIN, SUPER_ADMIN, VENDOR, PROVIDER (optionnel)', enum: [...USER_ROLES] },
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
      actionUrl: { type: 'string', description: 'lien action optionnel (relatif /https public uniquement)' },
    },
  },
]

function asNumber(value: unknown, fallback = 10, max = 50): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isAllowedActionUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return true
  const u = url.trim()
  if (!u) return true
  if (u.startsWith('/') && !u.startsWith('//')) return true
  if (/^https:\/\//i.test(u) && !isInternalOrPrivateHost(u)) return true
  return false
}

function getSubdoc(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = obj[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function sanitizeOrderForAgent(order: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(order.items)
    ? (order.items as Record<string, unknown>[]).map((item) => {
        const itemDelivery = getSubdoc(item, 'delivery')
        const itemShipping = getSubdoc(item, 'shipping')
        return {
          id: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price,
          currency: item.currency,
          variantLabels: item.variantLabels,
          delivery: itemDelivery
            ? {
                status: itemDelivery.status,
                trackingNumber: itemDelivery.trackingNumber,
                trackingUrl: itemDelivery.trackingUrl,
                lastUpdate: itemDelivery.lastUpdate,
              }
            : undefined,
          shipping: itemShipping
            ? {
                label: itemShipping.label,
                cost: itemShipping.cost,
                durationDays: itemShipping.durationDays,
                currency: itemShipping.currency,
              }
            : undefined,
        }
      })
    : []

  const shipping = getSubdoc(order, 'shipping')
  const fees = getSubdoc(order, 'fees')
  const delivery = getSubdoc(order, 'delivery')

  return {
    orderId: order.orderId,
    domain: order.domain,
    status: order.status,
    paymentStatus: order.paymentStatus,
    source: order.source,
    currency: order.currency,
    items,
    shipping: shipping
      ? {
          method: shipping.method,
          totalCost: shipping.totalCost,
          currency: shipping.currency,
          totalWeight: shipping.totalWeight,
          totalVolume: shipping.totalVolume,
          weightDetails: shipping.weightDetails,
        }
      : undefined,
    fees: fees
      ? {
          totalFees: fees.totalFees,
          serviceFeeRate: fees.serviceFeeRate,
          insuranceRate: fees.insuranceRate,
          quantityDiscount: fees.quantityDiscount,
        }
      : undefined,
    subtotal: order.subtotal,
    subtotalBeforeDiscounts: order.subtotalBeforeDiscounts,
    total: order.total,
    grainsDiscount: order.grainsDiscount,
    promoDiscount: order.promoDiscount,
    promoCode: order.promoCode,
    grainsUsed: order.grainsUsed,
    addOnsTotal: order.addOnsTotal,
    delivery: delivery
      ? {
          carrier: delivery.carrier,
          trackingNumber: delivery.trackingNumber,
          trackingUrl: delivery.trackingUrl,
          estimatedDeliveryDate: delivery.estimatedDeliveryDate,
          status: delivery.status,
          lastUpdate: delivery.lastUpdate,
        }
      : undefined,
    tags: order.tags,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    confirmedAt: order.confirmedAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    updatedBy: order.updatedBy,
  }
}

function summarizeOrder(order: Record<string, unknown>): Record<string, unknown> {
  return {
    orderId: String(order.orderId || ''),
    status: String(order.status || ''),
    paymentStatus: String(order.paymentStatus || ''),
    total: typeof order.total === 'number' ? order.total : undefined,
    createdAt: order.createdAt,
  }
}

export const adminAgentHandlers: Record<string, ToolHandler> = {
  async getOrders(args: Record<string, unknown>, _confirmed: boolean, _caller: { userId: string; role: string }) {
    await connectMongoose()
    const limit = asNumber(args.limit, 10, 50)
    const filter: Record<string, unknown> = {}

    if (args.status && typeof args.status === 'string') {
      if (!isValidOrderStatus(args.status)) {
        throw new Error(`statut invalide : ${args.status}`)
      }
      filter.status = args.status
    }

    if (args.clientName && typeof args.clientName === 'string') {
      filter.clientName = { $regex: escapeRegex(args.clientName), $options: 'i' }
    }

    if (args.orderId && typeof args.orderId === 'string') {
      filter.orderId = args.orderId
    }

    const orders = (await Order.find(filter).sort({ createdAt: -1 }).limit(limit).lean()) as Record<string, unknown>[]
    return orders.map((o) => summarizeOrder(o))
  },

  async getOrderDetails(args: Record<string, unknown>, _confirmed: boolean, _caller: { userId: string; role: string }) {
    await connectMongoose()
    const orderId = String(args.orderId || '')
    if (!orderId) throw new Error('orderId requis')
    const order = (await Order.findOne({ orderId }).lean()) as Record<string, unknown> | null
    if (!order) throw new Error('Commande introuvable')
    return sanitizeOrderForAgent(order)
  },

  async updateOrderStatus(args: Record<string, unknown>, confirmed: boolean, caller: { userId: string; role: string }) {
    if (!confirmed) throw new Error('Confirmation requise')
    await connectMongoose()
    const orderId = String(args.orderId || '')
    const status = String(args.status || '')
    if (!orderId || !status) throw new Error('orderId et status requis')

    if (!isValidOrderStatus(status)) {
      throw new Error(`statut invalide : ${status}`)
    }

    const result = await updateOrderStatus(orderId, status, {
      trackingNumber: typeof args.trackingNumber === 'string' ? args.trackingNumber : undefined,
      trackingUrl: typeof args.trackingUrl === 'string' ? args.trackingUrl : undefined,
      internalNotes: typeof args.internalNotes === 'string' ? args.internalNotes : undefined,
      updatedBy: caller.userId,
    })

    // Audit in-app notification for staff (only when the status actually changed)
    if (result.changed) {
      await InAppNotification.create({
        roles: ['ADMIN'],
        type: 'success',
        title: 'Mise à jour commande par agent IA',
        message: `Commande ${orderId} passée en "${status}" par l'agent (admin: ${caller.userId}).`,
        metadata: { orderId, status, agent: true, adminId: caller.userId },
      })
    }

    return {
      orderId,
      status,
      changed: result.changed,
      updatedAt: (result.order as Record<string, unknown> | null)?.updatedAt,
    }
  },

  async getAdminStats(_args: Record<string, unknown>, _confirmed: boolean, _caller: { userId: string; role: string }) {
    await connectMongoose()
    const [ordersTotal, ordersPending, usersTotal, kycPending] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: 'pending' }),
      User.countDocuments({}),
      KycRequest.countDocuments({ status: 'pending' }),
    ])
    return { ordersTotal, ordersPending, usersTotal, kycPending }
  },

  async getPendingKyc(args: Record<string, unknown>, _confirmed: boolean, _caller: { userId: string; role: string }) {
    await connectMongoose()
    const limit = asNumber(args.limit, 10, 50)
    const filter: Record<string, unknown> = {}

    if (args.status && typeof args.status === 'string') {
      if (!KYC_STATUSES.includes(args.status as (typeof KYC_STATUSES)[number])) {
        throw new Error(`statut KYC invalide : ${args.status}`)
      }
      filter.status = args.status
    }

    const requests = (await KycRequest.find(filter).sort({ createdAt: -1 }).limit(limit).lean()) as Record<string, unknown>[]
    return requests.map((r) => ({
      _id: String(r._id),
      providerId: String(r.providerId || ''),
      fullName: String(r.fullName || ''),
      trade: String(r.trade || ''),
      status: String(r.status || ''),
      createdAt: r.createdAt,
    }))
  },

  async searchUsers(args: Record<string, unknown>, _confirmed: boolean, _caller: { userId: string; role: string }) {
    await connectMongoose()
    const query = typeof args.query === 'string' ? escapeRegex(args.query) : ''
    const limit = asNumber(args.limit, 10, 50)
    const filter: Record<string, unknown> = {}

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ]
    }

    if (args.role && typeof args.role === 'string') {
      if (!USER_ROLES.includes(args.role as (typeof USER_ROLES)[number])) {
        throw new Error(`rôle invalide : ${args.role}`)
      }
      filter.role = args.role
    }

    const users = (await User.find(filter).limit(limit).lean()) as Record<string, unknown>[]
    return users.map((u) => ({
      _id: String(u._id),
      name: String(u.name || ''),
      role: String(u.role || ''),
    }))
  },

  async sendNotification(args: Record<string, unknown>, confirmed: boolean, caller: { userId: string; role: string }) {
    if (!confirmed) throw new Error('Confirmation requise')
    await connectMongoose()
    const userId = String(args.userId || '')
    const title = String(args.title || '')
    const message = String(args.message || '')
    const notifTypes = ['info', 'success', 'warning', 'error'] as const
    const type = typeof args.type === 'string' ? args.type : 'info'
    if (!notifTypes.includes(type as (typeof notifTypes)[number])) {
      throw new Error(`type de notification invalide : ${type}`)
    }
    if (!userId || !title || !message) throw new Error('userId, title et message requis')

    if (!Types.ObjectId.isValid(userId)) throw new Error('userId invalide')

    const targetUser = await User.findById(userId).lean()
    if (!targetUser) throw new Error('Utilisateur introuvable')

    const actionUrl = typeof args.actionUrl === 'string' ? args.actionUrl.trim() : undefined
    if (actionUrl && !isAllowedActionUrl(actionUrl)) throw new Error('actionUrl invalide')

    const notif = await InAppNotification.create({
      userId,
      type: type as InAppType,
      title,
      message,
      actionUrl,
      metadata: { sentByAgent: true, adminId: caller.userId },
    })

    return { notificationId: String(notif._id), userId, title, type }
  },
}
