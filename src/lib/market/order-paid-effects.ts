import mongoose from 'mongoose'
import { Order } from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import User from '@/lib/models/User'
import { notifyUser } from '@/lib/notify'
import { syncUserToProfiles } from '@/lib/user-profiles'
import { createEscrowTransaction, updateEscrowStatus } from '@/lib/escrow-service'
import type { EscrowStatus } from '@/lib/models/EscrowTransaction'
import { recordOrderCommission } from '@/lib/market/ambassador'

/**
 * Effets d'une commande DDM+ réellement payée (jamais à la simple création) :
 * garantie GAR, ventes notifiées aux vendeurs, statistiques client et éligibilité Pro.
 * Appelé une seule fois par confirmPayment (transition paymentStatus atomique).
 */
export async function onMarketOrderPaid(order: any): Promise<void> {
  await Promise.allSettled([
    ensureOrderGuarantee(order),
    notifyVendorsOfSale(order),
    recordClientPurchase(order),
    recordOrderCommission(order),
  ]).then(results => results.forEach(r => {
    if (r.status === 'rejected') console.error('[order-paid] effet en échec:', r.reason)
  }))
}

async function ensureOrderGuarantee(order: any): Promise<void> {
  // Réservation : une seule garantie par commande, même en cas de double appel
  const claimed = await Order.updateOne(
    { _id: order._id, guaranteeReference: { $exists: false } },
    { $set: { guaranteeReference: 'pending' } }
  )
  if (claimed.modifiedCount !== 1) return

  try {
    const tx = await createEscrowTransaction({
      userId: order.clientId ? String(order.clientId) : undefined,
      client: { name: order.clientName, phone: order.clientPhone, email: order.clientEmail },
      amount: order.total,
      orderId: String(order._id),
    })
    await Order.updateOne({ _id: order._id }, { $set: { guaranteeReference: tx.reference } })
    await updateEscrowStatus(tx.reference, 'payment_received', { note: `Paiement de la commande ${order.orderId}` })
    await updateEscrowStatus(tx.reference, 'funds_secured', { note: 'Fonds sécurisés jusqu\'à la livraison', notifyClient: true })
  } catch (err) {
    await Order.updateOne({ _id: order._id, guaranteeReference: 'pending' }, { $unset: { guaranteeReference: 1 } })
    throw err
  }
}

const GUARANTEE_STATUS: Partial<Record<string, EscrowStatus>> = {
  processing: 'order_placed',
  shipped: 'in_transit',
  delivered: 'delivered',
}

/** Fait suivre la garantie GAR au statut de la commande (sans bloquer le changement de statut). */
export async function syncOrderGuarantee(order: any, newStatus: string): Promise<void> {
  const reference = order?.guaranteeReference
  if (!reference || reference === 'pending') return
  const target: EscrowStatus | undefined = newStatus === 'cancelled'
    ? (order.paymentStatus === 'completed' ? 'refunded' : 'cancelled')
    : GUARANTEE_STATUS[newStatus]
  if (!target) return
  try {
    await updateEscrowStatus(reference, target, {
      note: `Commande ${order.orderId} : ${newStatus}`,
      notifyClient: target === 'delivered',
      deliveryInfo: newStatus === 'shipped' && order.delivery?.trackingNumber
        ? { trackingNumber: order.delivery.trackingNumber, carrier: order.delivery.carrier }
        : undefined,
    })
  } catch (err) {
    console.warn(`[guarantee] ${reference} → ${target}:`, err instanceof Error ? err.message : err)
  }
}

async function notifyVendorsOfSale(order: any): Promise<void> {
  const ids = (order.items || [])
    .map((it: any) => String(it.id || ''))
    .filter((id: string) => mongoose.isValidObjectId(id))
  if (ids.length === 0) return

  const products = await Product.find({ _id: { $in: ids }, sellerSlug: { $exists: true, $ne: null } })
    .select('sellerSlug sellerName').lean() as any[]
  const slugById = new Map(products.map(p => [String(p._id), p.sellerSlug as string]))

  const totals = new Map<string, { total: number; qty: number }>()
  for (const it of order.items || []) {
    const slug = slugById.get(String(it.id))
    if (!slug) continue
    const cur = totals.get(slug) || { total: 0, qty: 0 }
    cur.total += (Number(it.price) || 0) * (Number(it.qty) || 1)
    cur.qty += Number(it.qty) || 1
    totals.set(slug, cur)
  }
  if (totals.size === 0) return

  const VendorProfile = (await import('@/lib/models/VendorProfile')).default
  for (const [slug, info] of totals) {
    const vp = await VendorProfile.findOne({ slug }).select('userId').lean() as any
    if (!vp?.userId) continue
    await notifyUser(String(vp.userId), {
      type: 'success',
      title: 'Nouvelle vente payée',
      message: `${info.qty} article${info.qty > 1 ? 's' : ''} vendu${info.qty > 1 ? 's' : ''} — ${Math.round(info.total).toLocaleString('fr-FR')} F (commande ${order.orderId})`,
      actionUrl: '/espace-vendeur',
      metadata: { orderId: order.orderId, amount: info.total, qty: info.qty },
    })
  }
}

async function recordClientPurchase(order: any): Promise<void> {
  if (!order.clientId) return
  const userId = String(order.clientId)
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { totalMarketplacePurchases: order.total || 0, marketplaceOrderCount: 1 } },
    { new: true }
  ).lean() as any
  await syncUserToProfiles(userId)

  if (updatedUser && updatedUser.marketplaceTier === 'standard' && !updatedUser.proRequestedAt) {
    const isEligible = (updatedUser.totalMarketplacePurchases || 0) >= 150_000 || (updatedUser.marketplaceOrderCount || 0) >= 3
    if (isEligible) {
      await notifyUser(userId, {
        type: 'info',
        title: 'Compte Pro disponible',
        message: 'Vous êtes éligible au compte Pro ! Accédez aux prix wholesale dès 1 pièce.',
        actionUrl: '/compte/profil',
        metadata: { proEligible: true },
      })
    }
  }
}
