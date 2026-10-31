/**
 * Graphe LangGraph « order_sla_watchdog » — agent autonome des délais de commande DDM+.
 *
 * scan → act → report
 *
 * Quatre règles, chacune appliquée une seule fois par commande (Order.slaAlerts) :
 *  1. impayée depuis 40 % du délai d'annulation automatique (20 h sur 48 h) → relance du client ;
 *  2. stock Dakar payé, non expédié après 48 h → relance du vendeur ; après 96 h → alerte admin ;
 *  3. import payé resté « confirmé » (sourcing non lancé) après 5 jours → alerte admin ;
 *  4. expédiée, livraison estimée dépassée de 3 jours → alerte admin.
 * Aucune action irréversible : uniquement des messages. Pas d'humain dans la boucle.
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { Order } from '@/lib/models/Order'
import Shop from '@/lib/models/Shop'
import SourcingRequest from '@/lib/models/SourcingRequest'
import AgentRun from '@/lib/models/AgentRun'
import { notifyAdmins, notifyUser } from '@/lib/notify'
import { sendCustomerMessage } from '@/lib/customer-message'
import { MARKET_BRAND } from '@/lib/branding'
import { retrySourcingProposalNotifications } from '@/lib/market/sourcing-proposal'

const H = 3600_000
const UNPAID_TTL_H = Number(process.env.ORDER_PENDING_TTL_HOURS) > 0 ? Number(process.env.ORDER_PENDING_TTL_HOURS) : 48
const UNPAID_REMIND_AFTER_H = Number(process.env.SLA_UNPAID_REMIND_HOURS) || Math.round(UNPAID_TTL_H * 0.4)
const LOCAL_NUDGE_AFTER_H = Number(process.env.SLA_LOCAL_SHIP_HOURS) || 48
const LOCAL_ESCALATE_AFTER_H = LOCAL_NUDGE_AFTER_H * 2
const IMPORT_STALL_AFTER_H = (Number(process.env.SLA_IMPORT_STALL_DAYS) || 5) * 24
const DELIVERY_GRACE_H = 72
const BATCH = 100

const marketplaceOnly = { $or: [{ domain: 'marketplace' }, { domain: { $exists: false } }, { domain: null }] }

const WatchdogState = Annotation.Root({
  now: Annotation<number>,
  unpaid: Annotation<any[]>,
  localLate: Annotation<any[]>,
  importStalled: Annotation<any[]>,
  deliveryLate: Annotation<any[]>,
  actions: Annotation<Record<string, number>>,
})

async function scan(state: typeof WatchdogState.State) {
  const now = new Date(state.now)
  const ago = (h: number) => new Date(now.getTime() - h * H)
  const [unpaid, localLate, importStalled, deliveryLate] = await Promise.all([
    Order.find({
      ...marketplaceOnly,
      status: 'pending',
      paymentStatus: { $ne: 'completed' },
      createdAt: { $lt: ago(UNPAID_REMIND_AFTER_H), $gt: ago(UNPAID_TTL_H) },
      'slaAlerts.unpaidReminderAt': { $exists: false },
    }).select('orderId clientId clientPhone clientName total').limit(BATCH).lean(),
    Order.find({
      ...marketplaceOnly,
      paymentStatus: 'completed',
      status: { $in: ['confirmed', 'processing'] },
      'shipping.localShipments.0': { $exists: true },
      confirmedAt: { $lt: ago(LOCAL_NUDGE_AFTER_H) },
      'slaAlerts.adminEscalationAt': { $exists: false },
    }).select('orderId confirmedAt shipping.localShipments slaAlerts total').limit(BATCH).lean(),
    Order.find({
      ...marketplaceOnly,
      paymentStatus: 'completed',
      status: 'confirmed',
      'shipping.localShipments.0': { $exists: false },
      confirmedAt: { $lt: ago(IMPORT_STALL_AFTER_H) },
      'slaAlerts.adminEscalationAt': { $exists: false },
    }).select('orderId confirmedAt total').limit(BATCH).lean(),
    Order.find({
      ...marketplaceOnly,
      status: 'shipped',
      'delivery.estimatedDeliveryDate': { $lt: ago(DELIVERY_GRACE_H) },
      'slaAlerts.deliveryOverdueAt': { $exists: false },
    }).select('orderId delivery total').limit(BATCH).lean(),
  ])
  return { unpaid, localLate, importStalled, deliveryLate }
}

/** Pose l'horodatage d'abord : jamais deux relances, même si deux instances tournent. */
async function claim(orderId: string, field: string, now: Date, extra: Record<string, unknown> = {}) {
  const res = await Order.updateOne(
    { orderId, [`slaAlerts.${field}`]: { $exists: false }, ...extra },
    { $set: { [`slaAlerts.${field}`]: now } }
  )
  return res.modifiedCount === 1
}

async function act(state: typeof WatchdogState.State) {
  const now = new Date(state.now)
  const actions: Record<string, number> = { unpaidReminders: 0, vendorNudges: 0, escalations: 0, deliveryAlerts: 0 }
  const escalated: string[] = []

  for (const o of state.unpaid as any[]) {
    if (!(await claim(o.orderId, 'unpaidReminderAt', now))) continue
    const url = `${MARKET_BRAND.url}/paiement/checkout/${o.orderId}`
    const amount = Math.round(o.total || 0).toLocaleString('fr-FR')
    if (o.clientId) {
      await notifyUser(String(o.clientId), {
        type: 'warning',
        title: 'Commande en attente de paiement',
        message: `Votre commande ${o.orderId} (${amount} FCFA) sera bientôt annulée si elle n'est pas réglée.`,
        actionUrl: `/paiement/checkout/${o.orderId}`,
        metadata: { orderId: o.orderId },
        push: true,
      }).catch(() => undefined)
    }
    if (o.clientPhone) {
      await sendCustomerMessage(o.clientPhone, {
        sms: `${MARKET_BRAND.name} : votre commande ${o.orderId} (${amount} FCFA) attend son paiement et sera bientôt annulée sans règlement. Payer : ${url}`,
      }).catch(() => 'none')
    }
    actions.unpaidReminders++
  }

  for (const o of state.localLate as any[]) {
    const ageH = (now.getTime() - new Date(o.confirmedAt).getTime()) / H
    if (ageH >= LOCAL_ESCALATE_AFTER_H) {
      if (await claim(o.orderId, 'adminEscalationAt', now)) {
        escalated.push(`${o.orderId} (stock Dakar, payé il y a ${Math.round(ageH / 24)} j, non expédié)`)
        actions.escalations++
      }
      continue
    }
    if (o.slaAlerts?.vendorNudgeAt || !(await claim(o.orderId, 'vendorNudgeAt', now))) continue
    const shopIds = (o.shipping?.localShipments || []).map((s: any) => s.shopId).filter(Boolean)
    const shops = await Shop.find({ _id: { $in: shopIds } }).select('ownerId name').lean() as any[]
    for (const shop of shops) {
      if (!shop.ownerId) continue
      await notifyUser(String(shop.ownerId), {
        type: 'warning',
        title: 'Commande à expédier',
        message: `La commande ${o.orderId} est payée depuis ${Math.round(ageH)} h et n'est pas encore expédiée. Le client attend.`,
        actionUrl: '/espace-vendeur',
        metadata: { orderId: o.orderId },
        push: true,
      }).catch(() => undefined)
    }
    actions.vendorNudges++
  }

  for (const o of state.importStalled as any[]) {
    if (!(await claim(o.orderId, 'adminEscalationAt', now))) continue
    const days = Math.round((now.getTime() - new Date(o.confirmedAt).getTime()) / (24 * H))
    escalated.push(`${o.orderId} (import payé il y a ${days} j, sourcing non lancé)`)
    actions.escalations++
  }

  const late: string[] = []
  for (const o of state.deliveryLate as any[]) {
    if (!(await claim(o.orderId, 'deliveryOverdueAt', now))) continue
    late.push(`${o.orderId}${o.delivery?.carrier ? ` (${o.delivery.carrier})` : ''}`)
    actions.deliveryAlerts++
  }

  if (escalated.length) {
    await notifyAdmins({
      type: 'error',
      title: `${escalated.length} commande(s) payée(s) en retard`,
      message: escalated.slice(0, 10).join(' · '),
      actionUrl: '/admin/commandes',
      metadata: { orders: escalated.slice(0, 50) },
      push: true,
    })
  }
  if (late.length) {
    await notifyAdmins({
      type: 'warning',
      title: `${late.length} livraison(s) en retard`,
      message: `Date estimée dépassée de plus de 3 jours : ${late.slice(0, 10).join(' · ')}`,
      actionUrl: '/admin/commandes',
      metadata: { orders: late.slice(0, 50) },
      push: false,
    })
  }

  // « Trouvez-moi » : délai promis au client (24 h ouvrées) dépassé sans proposition.
  const overdue = await SourcingRequest.find({
    status: { $in: ['new', 'searching'] },
    slaDueAt: { $lt: now },
    slaAlertAt: { $exists: false },
  }).select('reference title description').limit(BATCH).lean() as any[]
  const overdueRefs: string[] = []
  for (const r of overdue) {
    const claimed = await SourcingRequest.updateOne({ _id: r._id, slaAlertAt: { $exists: false } }, { $set: { slaAlertAt: now } })
    if (claimed.modifiedCount === 1) overdueRefs.push(`${r.reference} (${String(r.title || r.description || '').slice(0, 30)})`)
  }
  if (overdueRefs.length) {
    actions.sourcingOverdue = overdueRefs.length
    await notifyAdmins({
      type: 'error',
      title: `${overdueRefs.length} demande(s) Trouvez-moi hors délai`,
      message: `Promesse de 24 h ouvrées dépassée : ${overdueRefs.slice(0, 10).join(' · ')}`,
      actionUrl: '/admin/market/sourcing-requests',
      metadata: { references: overdueRefs.slice(0, 50) },
      push: true,
    })
  }
  return { actions }
}

let compiled: ReturnType<typeof build> | null = null

function build() {
  return new StateGraph(WatchdogState)
    .addNode('scan', scan)
    .addNode('act', act)
    .addEdge(START, 'scan')
    .addEdge('scan', 'act')
    .addEdge('act', END)
    .compile()
}

/** Lancé par le cron DDM+ horaire (une seule instance grâce à runOncePerSlot). */
export async function runOrderSlaWatchdog(now = new Date()) {
  await retrySourcingProposalNotifications().catch(() => console.warn('[sourcing] reprise des notifications indisponible'))
  if (!compiled) compiled = build()
  const t0 = Date.now()
  const threadId = `order_sla_watchdog:${now.toISOString().slice(0, 13)}`
  const result = await compiled.invoke({ now: now.getTime() })
  const actions = (result as any).actions || {}
  const total = Object.values(actions).reduce((s: number, n: any) => s + Number(n || 0), 0)
  if (total > 0) {
    await AgentRun.findOneAndUpdate(
      { threadId },
      { $set: { status: 'done', graph: 'order_sla_watchdog', refId: threadId, llmUsed: false, durationMs: Date.now() - t0 }, $setOnInsert: { threadId } },
      { upsert: true }
    ).catch(() => undefined)
  }
  return actions
}
