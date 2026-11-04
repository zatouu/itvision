import crypto from 'crypto'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { freightCost, shippingAdjustment, shippingTolerance, METHOD_TO_RATE } from '@/lib/shipping/freight'
import { sendCustomerMessage } from '@/lib/customer-message'
import { notifyAdmins, notifyUser } from '@/lib/notify'
import { MARKET_BRAND } from '@/lib/branding'
import { readSharedPricing, sharedPricingSnapshotSchema } from '@/lib/pricing/shared-settings'

export class FreightError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

const fcfa = (n: number) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`
const kg = (n: number) => `${Math.round(n * 10) / 10} kg`
const payUrl = (ref: string) => `${MARKET_BRAND.url}/paiement/checkout/${ref}`

export function newTransportReference(): string {
  return `TR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

export interface Measure {
  weightKg: number
  volumeM3?: number
}

/**
 * Commande payée : pesée réelle à Guangzhou → transport réel comparé au transport payé.
 * Écart dans la tolérance : rien ne change. Au-delà : complément (lien TR-…) ou remboursement du dépassement.
 */
export async function recordOrderRealWeight(orderId: string, measure: Measure, by: string, dryRun = false) {
  const order = await Order.findOne({ orderId }).lean() as any
  if (!order) throw new FreightError('Commande introuvable', 404)
  if (order.status === 'cancelled') throw new FreightError('Commande annulée')
  if (order.paymentStatus !== 'completed') throw new FreightError('Commande non payée : rien à régulariser')
  const method = order.shipping?.method
  if (!METHOD_TO_RATE[method]) throw new FreightError('Livraison locale : pas de fret international')
  const prev = order.shippingAdjustment
  if (prev && (prev.status === 'paid' || prev.status === 'refund' || (prev.paidAmount || 0) > 0)) {
    throw new FreightError('Transport déjà régularisé sur cette commande', 409)
  }

  const localFees = (order.shipping?.localShipments || []).reduce((s: number, l: any) => s + (l.feeFcfa || 0), 0)
  const estimatedCost = Math.max(0, Math.round((order.shipping?.totalCost || 0) - localFees))
  const pricing = order.pricingSnapshot ? sharedPricingSnapshotSchema.parse(order.pricingSnapshot) : await readSharedPricing()
  const tolerance = shippingTolerance(pricing.config)
  const real = freightCost(method, measure, pricing.config)
  if (!real) throw new FreightError('Tarif de transport introuvable')
  const amount = shippingAdjustment(estimatedCost, real.cost, tolerance)
  const status = amount > 0 ? 'awaiting_payment' : amount < 0 ? 'refund' : 'absorbed'
  const adjustment = {
    realWeightKg: measure.weightKg,
    realVolumeM3: measure.volumeM3,
    estimatedCost,
    realCost: real.cost,
    amount,
    status,
    paymentReference: amount > 0 ? prev?.paymentReference || newTransportReference() : undefined,
    measuredAt: new Date(),
    measuredBy: by,
  }
  const summary = { estimatedCost, realCost: real.cost, billed: real.billed, unit: real.unit, amount, status, tolerance }
  if (dryRun) return summary

  const set: Record<string, unknown> = { shippingAdjustment: adjustment }
  const refundable = amount < 0 && (!order.refundStatus || order.refundStatus === 'none')
  if (refundable) {
    set.refundStatus = 'pending'
    set.refundAmount = -amount
  }
  await Order.updateOne({ _id: order._id }, { $set: set })

  if (amount < 0 && !refundable) {
    void notifyAdmins({
      type: 'warning',
      title: 'Remboursement transport à traiter à la main',
      message: `Commande ${orderId} : ${fcfa(-amount)} de transport trop perçu, mais un autre remboursement est déjà enregistré.`,
      actionUrl: '/admin/marketplace/remboursements',
      metadata: { orderId, amount: -amount },
    })
  }
  if (amount < 0 && refundable) {
    void notifyAdmins({
      type: 'info',
      title: 'Transport trop perçu à rembourser',
      message: `Commande ${orderId} : poids réel inférieur à l'estimation, ${fcfa(-amount)} à rembourser.`,
      actionUrl: '/admin/marketplace/remboursements',
      metadata: { orderId, amount: -amount },
    })
  }

  const weightText = kg(measure.weightKg)
  const message =
    amount > 0
      ? `Votre colis ${orderId} pèse ${weightText} à la pesée en Chine : transport réel ${fcfa(real.cost)}, estimé ${fcfa(estimatedCost)}. Les ${Math.round(tolerance * 100)} % d'écart sont offerts, reste ${fcfa(amount)} à régler avant la livraison.`
      : amount < 0
        ? `Bonne nouvelle : votre colis ${orderId} pèse ${weightText}, moins que prévu. ${fcfa(-amount)} de transport vous seront remboursés.`
        : `Votre colis ${orderId} a été pesé en Chine (${weightText}) : le transport payé est confirmé, rien à ajouter.`
  if (order.clientId) {
    void notifyUser(String(order.clientId), {
      type: amount > 0 ? 'warning' : 'info',
      title: amount > 0 ? 'Complément de transport à régler' : 'Pesée de votre colis',
      message,
      actionUrl: amount > 0 ? `/paiement/checkout/${adjustment.paymentReference}` : `/commandes/${orderId}`,
      metadata: { orderId, amount },
    })
  }
  if (amount !== 0 && order.clientPhone) {
    await sendCustomerMessage(order.clientPhone, {
      sms: amount > 0
        ? `${MARKET_BRAND.name} : colis ${orderId} pesé ${weightText}. Complément transport ${fcfa(amount)} à régler avant livraison : ${payUrl(adjustment.paymentReference!)}`
        : `${MARKET_BRAND.name} : colis ${orderId} pesé ${weightText}, plus léger que prévu. ${fcfa(-amount)} vous seront remboursés.`,
      whatsapp: amount > 0
        ? { template: process.env.WHATSAPP_TEMPLATE_TRANSPORT_DUE, params: [orderId, weightText, fcfa(amount)], buttonUrlSuffix: adjustment.paymentReference }
        : undefined,
    })
  }
  return summary
}

/**
 * Lot d'achat groupé pesé à Guangzhou : transport réel réparti au prorata des pièces
 * entre les participants ayant payé, chacun reçoit son lien TR-….
 */
export async function recordGroupRealWeight(groupId: string, measure: Measure, by: string, dryRun = false) {
  const group = await GroupOrder.findOne({ groupId })
  if (!group) throw new FreightError('Achat groupé introuvable', 404)
  if (!['ordering', 'ordered', 'shipped'].includes(group.status)) {
    throw new FreightError('La pesée se saisit une fois le lot acheté (statut « En commande », « Commandé » ou « Expédié »)')
  }
  const payers = (group.participants as any[]).filter(p => ['paid', 'partial'].includes(p.paymentStatus))
  if (payers.length === 0) throw new FreightError('Aucun participant payé')
  if (payers.some(p => p.transport && (p.transport.paymentStatus === 'paid' || (p.transport.paidAmount || 0) > 0))) {
    throw new FreightError('Des participants ont déjà réglé leur transport : pesée verrouillée', 409)
  }
  const pricing = group.pricingSnapshot ? sharedPricingSnapshotSchema.parse(group.pricingSnapshot) : await readSharedPricing()
  const real = freightCost(group.shippingMethod || 'maritime_60j', measure, pricing.config)
  if (!real) throw new FreightError('Tarif de transport introuvable')

  const totalQty = payers.reduce((s, p) => s + (p.qty || 0), 0)
  let remaining = real.cost
  const shares = payers.map((p, i) => {
    const amount = i === payers.length - 1 ? remaining : Math.round((real.cost * p.qty) / totalQty)
    remaining -= amount
    return { p, amount: Math.max(0, amount) }
  })
  const summary = {
    realCost: real.cost,
    billed: real.billed,
    unit: real.unit,
    perPiece: totalQty > 0 ? Math.round(real.cost / totalQty) : 0,
    estimatedPerPiece: group.shippingCostPerUnit || 0,
    participants: shares.map(s => ({ name: s.p.name, qty: s.p.qty, amount: s.amount })),
  }
  if (dryRun) return summary

  for (const s of shares) {
    s.p.transport = {
      amount: s.amount,
      paymentReference: s.p.transport?.paymentReference || newTransportReference(),
      paymentStatus: s.amount > 0 ? 'pending' : 'paid',
    }
  }
  ;(group as any).freight = { realWeightKg: measure.weightKg, realVolumeM3: measure.volumeM3, totalCost: real.cost, measuredAt: new Date(), measuredBy: by }
  await group.save()

  const name = String(group.product?.name || 'achat groupé').slice(0, 60)
  for (const s of shares) {
    if (s.amount <= 0) continue
    const ref = s.p.transport.paymentReference
    const message = `Lot pesé en Chine : ${kg(measure.weightKg)} au total. Votre part de transport pour ${s.p.qty} pièce${s.p.qty > 1 ? 's' : ''} : ${fcfa(s.amount)}, à régler avant la livraison.`
    if (s.p.userId) {
      void notifyUser(String(s.p.userId), {
        type: 'info',
        title: `Transport à régler : ${name}`,
        message,
        actionUrl: `/paiement/checkout/${ref}`,
        metadata: { groupId, amount: s.amount },
      })
    }
    await sendCustomerMessage(s.p.phone, {
      sms: `${MARKET_BRAND.name} : ${name}, transport au poids réel ${fcfa(s.amount)} pour vos ${s.p.qty} pcs, à régler avant livraison : ${payUrl(ref)}`,
      whatsapp: { template: process.env.WHATSAPP_TEMPLATE_TRANSPORT_DUE, params: [name, kg(measure.weightKg), fcfa(s.amount)], buttonUrlSuffix: ref },
    })
  }
  return summary
}

/** Paiement reçu sur une référence TR-… (idempotent : seul un paiement « en attente » est pris en compte). */
export async function confirmTransportPayment(input: { reference: string; amount: number; provider: string; transactionId: string }) {
  const now = new Date()
  const group = await GroupOrder.findOneAndUpdate(
    { participants: { $elemMatch: { 'transport.paymentReference': input.reference, 'transport.paymentStatus': 'pending' } } },
    {
      $inc: { 'participants.$.transport.paidAmount': input.amount },
      $set: { 'participants.$.transport.paymentMethod': input.provider, 'participants.$.transport.transactionId': input.transactionId, 'participants.$.transport.paidAt': now },
    },
    { new: true }
  ).lean() as any
  if (group) {
    const p = group.participants.find((x: any) => x.transport?.paymentReference === input.reference)
    if (p && (p.transport.paidAmount || 0) >= (p.transport.amount || 0)) {
      await GroupOrder.updateOne(
        { groupId: group.groupId, participants: { $elemMatch: { 'transport.paymentReference': input.reference } } },
        { $set: { 'participants.$.transport.paymentStatus': 'paid' } }
      )
    }
    if (p?.userId) {
      void notifyUser(String(p.userId), { type: 'success', title: 'Transport réglé', message: `${fcfa(input.amount)} reçus pour le transport de ${group.product?.name || 'votre lot'}.`, actionUrl: `/achats-groupes/${group.groupId}` })
    }
    return { found: true, changed: true, type: 'group' as const, reference: input.reference }
  }
  if (await GroupOrder.exists({ 'participants.transport.paymentReference': input.reference })) {
    return { found: true, changed: false, type: 'group' as const, reference: input.reference }
  }

  const order = await Order.findOneAndUpdate(
    { 'shippingAdjustment.paymentReference': input.reference, 'shippingAdjustment.status': 'awaiting_payment' },
    {
      $inc: { 'shippingAdjustment.paidAmount': input.amount },
      $set: { 'shippingAdjustment.paymentMethod': input.provider, 'shippingAdjustment.transactionId': input.transactionId, 'shippingAdjustment.paidAt': now },
    },
    { new: true }
  ).lean() as any
  if (order) {
    if ((order.shippingAdjustment.paidAmount || 0) >= (order.shippingAdjustment.amount || 0)) {
      await Order.updateOne({ _id: order._id }, { $set: { 'shippingAdjustment.status': 'paid' } })
    }
    if (order.clientId) {
      void notifyUser(String(order.clientId), { type: 'success', title: 'Complément de transport réglé', message: `Commande ${order.orderId} : ${fcfa(input.amount)} reçus, la livraison peut suivre.`, actionUrl: `/commandes/${order.orderId}` })
    }
    return { found: true, changed: true, type: 'order' as const, reference: input.reference }
  }
  const exists = await Order.exists({ 'shippingAdjustment.paymentReference': input.reference })
  return { found: !!exists, changed: false, type: 'order' as const, reference: input.reference }
}

/** Colis disponible au point de retrait : message WhatsApp (modèle configuré) ou SMS. */
export async function notifyReadyForPickup(kind: 'order' | 'group', id: string) {
  const now = new Date()
  if (kind === 'order') {
    const order = await Order.findOne({ orderId: id }).lean() as any
    if (!order) throw new FreightError('Commande introuvable', 404)
    if (!order.pickupPoint) throw new FreightError('Cette commande est livrée à domicile')
    if (order.shippingAdjustment?.status === 'awaiting_payment') throw new FreightError('Complément de transport non réglé')
    await Order.updateOne({ _id: order._id }, { $set: { readyForPickupAt: now } })
    const channel = await sendCustomerMessage(order.clientPhone, {
      sms: `${MARKET_BRAND.name} : votre colis ${order.orderId} vous attend à ${order.pickupPoint.name}${order.pickupPoint.address ? ` (${order.pickupPoint.address})` : ''}. Présentez ce numéro au retrait.`,
      whatsapp: { template: process.env.WHATSAPP_TEMPLATE_PICKUP_READY, params: [order.orderId, order.pickupPoint.name] },
    })
    if (order.clientId) {
      void notifyUser(String(order.clientId), { type: 'success', title: 'Colis disponible', message: `Votre colis ${order.orderId} vous attend à ${order.pickupPoint.name}.`, actionUrl: `/commandes/${order.orderId}` })
    }
    return { notified: channel === 'none' ? 0 : 1, skipped: 0 }
  }

  const group = await GroupOrder.findOne({ groupId: id })
  if (!group) throw new FreightError('Achat groupé introuvable', 404)
  let notified = 0
  let skipped = 0
  const name = String(group.product?.name || 'votre achat groupé').slice(0, 60)
  for (const p of group.participants as any[]) {
    if (!p.pickupPoint || p.paymentStatus !== 'paid' || p.readyForPickupAt) continue
    if (p.transport && p.transport.paymentStatus !== 'paid') { skipped++; continue }
    p.readyForPickupAt = now
    const channel = await sendCustomerMessage(p.phone, {
      sms: `${MARKET_BRAND.name} : vos ${p.qty} pcs « ${name} » vous attendent à ${p.pickupPoint.name}. Présentez la référence ${group.groupId} au retrait.`,
      whatsapp: { template: process.env.WHATSAPP_TEMPLATE_PICKUP_READY, params: [group.groupId, p.pickupPoint.name] },
    })
    if (channel !== 'none') notified++
    if (p.userId) void notifyUser(String(p.userId), { type: 'success', title: 'Lot disponible', message: `Vos ${p.qty} pièces vous attendent à ${p.pickupPoint.name}.`, actionUrl: `/achats-groupes/${group.groupId}` })
  }
  await group.save()
  return { notified, skipped }
}
