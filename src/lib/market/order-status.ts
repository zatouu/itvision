import { Order } from '@/lib/models/Order'
import { restoreProductStock } from '@/lib/inventory'
import { reverseGrainsForOrder, updateTierFromBalance } from '@/lib/grains'
import { sendWebPushToOrder } from '@/lib/push-web'

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
    { orderId },
    { $set: update },
    { new: true, runValidators: true, context: 'query' }
  ).lean()) as Record<string, unknown> | null

  if (!updated) throw new Error('Commande introuvable')

  if (newStatus === 'cancelled') {
    const reservations = Array.isArray(updated.inventoryReservations) ? updated.inventoryReservations : []
    if (reservations.length > 0) {
      for (const reservation of reservations as Array<Record<string, unknown>>) {
        if (reservation.restored) continue
        try {
          const productId = String(reservation.productId || '')
          const qty = typeof reservation.qty === 'number' ? reservation.qty : 0
          const variantIds = Array.isArray(reservation.variantIds)
            ? reservation.variantIds.map((v) => String(v))
            : undefined
          const result = await restoreProductStock(productId, qty, variantIds)
          if (result.ok) {
            reservation.restored = true
          } else {
            console.error(`[order-status] Échec restauration stock commande ${orderId}:`, result.error)
          }
        } catch (err) {
          console.error(`[order-status] Exception restauration stock commande ${orderId}:`, err)
        }
      }
      await Order.updateOne({ _id: updated._id }, { inventoryReservations: reservations })
    }

    const clientId = updated.clientId
    if (clientId) {
      try {
        const clientIdString = typeof clientId === 'string' ? clientId : String(clientId)
        await reverseGrainsForOrder(clientIdString, String(updated._id), 'commande annulée')
        await updateTierFromBalance(clientIdString)
      } catch (err) {
        console.error('[order-status] Erreur reverse grains commande:', err)
      }
    }
  }

  void sendWebPushToOrder(orderId, {
    title: 'DDM+ - Statut commande mis à jour',
    body: `Votre commande ${orderId} est maintenant ${ORDER_STATUS_LABELS[newStatus]}.`,
    icon: '/android-chrome-192x192.png',
    url: `/commandes/${orderId}`,
    tag: `order-status-${orderId}`,
  }).catch((err: Error) => console.error('[WebPush] order status push error:', err))

  return { order: updated, changed: true }
}
