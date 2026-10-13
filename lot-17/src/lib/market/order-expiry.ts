import { Order } from '@/lib/models/Order'
import Payment from '@/lib/models/Payment'
import { updateOrderStatus } from '@/lib/market/order-status'

const DEFAULT_TTL_HOURS = 48

/**
 * Annule les commandes jamais payées au-delà du délai (ORDER_PENDING_TTL_HOURS, 48 h par défaut) :
 * stock, code promo et grains utilisés sont rendus par la transition « cancelled ».
 * Une commande avec un paiement en cours ou en vérification manuelle n'est jamais touchée.
 */
export async function expireUnpaidOrders(now = new Date()): Promise<number> {
  const ttlHours = Number(process.env.ORDER_PENDING_TTL_HOURS) > 0 ? Number(process.env.ORDER_PENDING_TTL_HOURS) : DEFAULT_TTL_HOURS
  const cutoff = new Date(now.getTime() - ttlHours * 60 * 60 * 1000)

  const candidates = await Order.find({
    status: 'pending',
    paymentStatus: { $ne: 'completed' },
    createdAt: { $lt: cutoff },
    $or: [{ domain: 'marketplace' }, { domain: { $exists: false } }, { domain: null }],
  }).select('orderId').limit(200).lean() as any[]
  if (candidates.length === 0) return 0

  const refs = candidates.map(o => o.orderId)
  const inFlight = new Set(
    (await Payment.find({ orderId: { $in: refs }, status: { $in: ['pending', 'held', 'released'] } })
      .select('orderId').lean() as any[]).map(p => p.orderId)
  )

  let cancelled = 0
  for (const ref of refs) {
    if (inFlight.has(ref)) continue
    try {
      const res = await updateOrderStatus(ref, 'cancelled', { updatedBy: 'system:expiration' })
      if (res.changed) cancelled++
    } catch (err) {
      console.warn(`[order-expiry] ${ref}:`, err instanceof Error ? err.message : err)
    }
  }
  return cancelled
}
