import { Order } from '@/lib/models/Order'
import PromoCode from '@/lib/models/PromoCode'
import { restoreProductStock } from '@/lib/inventory'
import { reverseGrainsForOrder, refundSpentGrainsForOrder, updateTierFromBalance } from '@/lib/grains'
import { sendWebPushToOrder } from '@/lib/push-web'
import { notifyAdmins } from '@/lib/notify'
import { syncOrderGuarantee } from '@/lib/market/order-paid-effects'
import { syncOrderCommission } from '@/lib/market/ambassador'

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export const ORDER_STATUS_VALUES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'en attente',
  confirmed: 'confirmée',
  processing: 'en traitement',
  shipped: 'expédiée',
  delivered: 'livrée',
  cancelled: 'annulée',
}

export function isValidOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUS_VALUES as readonly string[]).includes(value)
}

export function isAllowedOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || ORDER_STATUS_TRANSITIONS[from].includes(to)
}

export interface UpdateOrderStatusOptions {
  trackingNumber?: string
  trackingUrl?: string
  internalNotes?: string
  updatedBy?: string
}

export interface UpdateOrderStatusResult {
  order: Record<string, unknown> | null
  changed: boolean
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options: UpdateOrderStatusOptions = {}
): Promise<UpdateOrderStatusResult> {
  const existing = (await Order.findOne({ orderId }).lean()) as Record<string, unknown> | null
  if (!existing) throw new Error('Commande introuvable')

  const currentStatus = existing.status as OrderStatus
  if (currentStatus === newStatus) {
    return { order: existing, changed: false }
  }

  if (!isAllowedOrderStatusTransition(currentStatus, newStatus)) {
    throw new Error(`Transition interdite de "${currentStatus}" vers "${newStatus}"`)
  }

  const update: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  }

  if (newStatus === 'confirmed') update.confirmedAt = new Date()
  if (newStatus === 'shipped') update.shippedAt = new Date()
  if (newStatus === 'delivered') update.deliveredAt = new Date()

  if (options.trackingNumber && newStatus === 'shipped') {
    update['delivery.trackingNumber'] = String(options.trackingNumber)
    if (options.trackingUrl) {
      update['delivery.trackingUrl'] = String(options.trackingUrl)
    }
    update['delivery.lastUpdate'] = new Date()
  }

  if (options.internalNotes && typeof options.internalNotes === 'string') {
    update.internalNotes = options.internalNotes
  }

  if (options.updatedBy && typeof options.updatedBy === 'string') {
    update.updatedBy = options.updatedBy
  }

  const updated = (await Order.findOneAndUpdate(
    { orderId, status: currentStatus },
    { $set: update },
    { new: true, runValidators: true, context: 'query' }
  ).lean()) as Record<string, unknown> | null

  if (!updated) throw new Error('Le statut de la commande a changé entre-temps')

  if (newStatus === 'cancelled') {
    await applyOrderCancellationEffects(updated, 'commande annulée')
  }
  if (newStatus === 'delivered') {
    await syncOrderCommission(orderId, 'delivered').catch((err) => console.error('[order-status] commission:', err))
  }
  await syncOrderGuarantee(updated, newStatus)

  void sendWebPushToOrder(orderId, {
    title: 'DDM+ - Statut commande mis à jour',
    body: `Votre commande ${orderId} est maintenant ${ORDER_STATUS_LABELS[newStatus]}.`,
    icon: '/android-chrome-192x192.png',
    url: `/commandes/${orderId}`,
    tag: `order-status-${orderId}`,
  }).catch((err: Error) => console.error('[WebPush] order status push error:', err))

  return { order: updated, changed: true }
}

/**
 * Effets de l'annulation d'une commande, à appeler une seule fois après la transition
 * conditionnelle vers « cancelled » : stock, code promo, grains gagnés et utilisés,
 * remboursement dû si la commande était payée.
 */
export async function applyOrderCancellationEffects(order: any, reason: string): Promise<void> {
  if (!order) return

  const reservations = Array.isArray(order.inventoryReservations) ? order.inventoryReservations : []
  if (reservations.length > 0) {
    for (const reservation of reservations) {
      if (reservation.restored) continue
      const remaining = (Number(reservation.qty) || 0) - (Number(reservation.restoredQty) || 0)
      if (remaining <= 0) {
        reservation.restored = true
        continue
      }
      try {
        const variantIds = Array.isArray(reservation.variantIds) ? reservation.variantIds.map((v: unknown) => String(v)) : undefined
        const result = await restoreProductStock(String(reservation.productId || ''), remaining, variantIds)
        if (result.ok) {
          reservation.restoredQty = reservation.qty
          reservation.restored = true
        } else {
          console.error(`[order-status] Échec restauration stock commande ${order.orderId}:`, result.error)
        }
      } catch (err) {
        console.error(`[order-status] Exception restauration stock commande ${order.orderId}:`, err)
      }
    }
    await Order.updateOne({ _id: order._id }, { inventoryReservations: reservations })
  }

  if (order.promoCode && (order.promoDiscount || 0) > 0) {
    try {
      const claimed = await Order.updateOne({ _id: order._id, promoRestored: { $ne: true } }, { $set: { promoRestored: true } })
      if (claimed.modifiedCount === 1) {
        await PromoCode.updateOne({ code: String(order.promoCode).toUpperCase(), usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } })
      }
    } catch (err) {
      console.error('[order-status] Erreur restitution promo:', err)
    }
  }

  if (order.clientId) {
    const clientId = String(order.clientId)
    try {
      await reverseGrainsForOrder(clientId, order._id, reason)
      if ((order.grainsUsed || 0) > 0) await refundSpentGrainsForOrder(clientId, order._id, order.orderId)
      await updateTierFromBalance(clientId)
    } catch (err) {
      console.error('[order-status] Erreur grains commande annulée:', err)
    }
  }

  await syncOrderCommission(String(order.orderId), 'cancelled').catch((err) => console.error('[order-status] commission:', err))

  // Commande déjà encaissée : remboursement à effectuer et à tracer
  if (order.paymentStatus === 'completed' && (order.total || 0) > 0) {
    const queued = await Order.updateOne(
      { _id: order._id, refundStatus: { $nin: ['pending', 'done'] } },
      { $set: { refundStatus: 'pending', refundAmount: order.total } }
    ).catch(() => null)
    if (queued?.modifiedCount === 1) {
      void notifyAdmins({
        type: 'warning',
        title: 'Remboursement commande à effectuer',
        message: `Commande ${order.orderId} annulée après paiement : ${Math.round(order.total).toLocaleString('fr-FR')} FCFA à rembourser (${order.paymentMethod || 'moyen inconnu'}).`,
        actionUrl: '/admin/marketplace/remboursements',
        metadata: { orderId: order.orderId, amount: order.total },
      })
    }
  }
}
