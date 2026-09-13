import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Payment from '@/lib/models/Payment'
import TopupPayment from '@/lib/models/TopupPayment'

/**
 * Finance isolée par domaine — source unique de vérité des agrégats.
 * Utilisée par /api/admin/treasury (dashboard) et /api/cron/finance-digest (email hebdo).
 * Le `global` est consolidé à partir de ces blocs — ne jamais re-interroger
 * les modèles en dehors de ces fonctions pour la compta par domaine.
 */

export interface MarketplaceFinance {
  ordersCount: number
  groupsWithPayments: number
  revenueCollected: number
  revenuePending: number
  serviceFees: number
  insuranceFees: number
  shippingCollected: number
  discountsGranted: number
}

export interface XeuyFinance {
  paymentsHeld: number
  paymentsReleased: number
  paymentsPending: number
  paymentsRefunded: number
  paymentsFailed: number
  topupsCollected: number
  topupsPending: number
  totalCollected: number
}

export interface CorporateFinance {
  revenueBilled: number
  revenueCollected: number
  receivablesOpen: number
  expensesPaid: number
}

export interface GlobalFinance {
  revenueCollected: number
  revenuePending: number
  expensesPaid: number
  treasuryBalance: number
}

type DateRange = { $gte: Date; $lte: Date }

/** Marketplace (DDM+) : commandes standard payées + achats groupés (participants payés).
 *  Les `Payment` domain marketplace/group ne sont PAS comptés — couche technique de
 *  suivi ; le ledger financier reste Order/GroupOrder (évite le double comptage). */
export async function computeMarketplaceFinance(createdAt: DateRange): Promise<MarketplaceFinance> {
  const [marketOrders, groupOrders] = await Promise.all([
    // Les commandes legacy sans `domain` sont marketplace par défaut (défaut du schéma)
    Order.find({ createdAt, $or: [{ domain: 'marketplace' }, { domain: { $exists: false } }, { domain: null }] })
      .select('orderId total paymentStatus status fees.serviceFeeAmount fees.insuranceAmount shipping.cost promoDiscount grainsDiscount createdAt')
      .lean() as any,
    GroupOrder.find({ createdAt })
      .select('groupId status participants.paymentStatus participants.paidAmount participants.totalAmount')
      .lean() as any,
  ])

  let ordersCount = 0, revenueCollected = 0, revenuePending = 0
  let serviceFees = 0, insuranceFees = 0, shippingCollected = 0, discountsGranted = 0
  for (const o of marketOrders as any[]) {
    if (o.status === 'cancelled') continue
    ordersCount += 1
    const total = Number(o.total || 0)
    if (o.paymentStatus === 'completed') {
      revenueCollected += total
      serviceFees += Number(o.fees?.serviceFeeAmount || 0)
      insuranceFees += Number(o.fees?.insuranceAmount || 0)
      shippingCollected += Number(o.shipping?.cost || 0)
      discountsGranted += Number(o.promoDiscount || 0) + Number(o.grainsDiscount || 0)
    } else if (o.paymentStatus !== 'failed' && o.paymentStatus !== 'refunded') {
      revenuePending += total
    }
  }

  let groupCollected = 0, groupPending = 0, groupsWithPayments = 0
  for (const g of groupOrders as any[]) {
    let paid = false
    for (const p of (g.participants || [])) {
      if (p.paymentStatus === 'paid') {
        groupCollected += Number(p.paidAmount || p.totalAmount || 0)
        paid = true
      } else if (p.paymentStatus === 'pending') {
        groupPending += Number(p.totalAmount || 0)
      }
    }
    if (paid) groupsWithPayments += 1
  }

  return {
    ordersCount,
    groupsWithPayments,
    revenueCollected: revenueCollected + groupCollected,
    revenuePending: revenuePending + groupPending,
    serviceFees,
    insuranceFees,
    shippingCollected,
    discountsGranted,
  }
}

/** Xeuy (services) : paiements de missions par statut + recharges wallet encaissées.
 *  Les points XC sont une monnaie interne — seuls les FCFA entrent dans le CA. */
export async function computeXeuyFinance(createdAt: DateRange): Promise<XeuyFinance> {
  const [servicePayments, topups] = await Promise.all([
    // Les paiements legacy sans `domain` sont des missions services (défaut du schéma)
    Payment.find({ createdAt, $or: [{ domain: 'services' }, { domain: { $exists: false } }, { domain: null }] })
      .select('amount status provider phase manualConfirm createdAt')
      .lean() as any,
    TopupPayment.find({ createdAt })
      .select('amountFcfa points bonusCredits status createdAt')
      .lean() as any,
  ])

  let held = 0, released = 0, pending = 0, refunded = 0, failed = 0
  for (const p of servicePayments as any[]) {
    const amt = Number(p.amount || 0)
    if (p.status === 'held') held += amt
    else if (p.status === 'released') released += amt
    else if (p.status === 'refunded') refunded += amt
    else if (p.status === 'failed') failed += amt
    else pending += amt
  }

  let topupsCollected = 0, topupsPending = 0
  for (const t of topups as any[]) {
    if (t.status === 'successful') topupsCollected += Number(t.amountFcfa || 0)
    else if (t.status === 'pending') topupsPending += Number(t.amountFcfa || 0)
  }

  return {
    paymentsHeld: held,
    paymentsReleased: released,
    paymentsPending: pending,
    paymentsRefunded: refunded,
    paymentsFailed: failed,
    topupsCollected,
    topupsPending,
    totalCollected: held + released + topupsCollected,
  }
}

/** Consolidation globale — somme des blocs domaine, sans re-lecture des modèles. */
export function consolidateGlobal(
  corporate: CorporateFinance,
  marketplace: MarketplaceFinance,
  xeuy: XeuyFinance
): GlobalFinance {
  return {
    revenueCollected: corporate.revenueCollected + marketplace.revenueCollected + xeuy.totalCollected,
    revenuePending: corporate.receivablesOpen + marketplace.revenuePending + xeuy.paymentsPending + xeuy.topupsPending,
    expensesPaid: corporate.expensesPaid,
    treasuryBalance: corporate.revenueCollected - corporate.expensesPaid + marketplace.revenueCollected + xeuy.totalCollected,
  }
}
