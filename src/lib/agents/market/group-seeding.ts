/**
 * Graphe LangGraph « group_order_seeding » — transformer une demande latente en achat groupé.
 *
 * loadContext → plan → gate → [pitch (LLM) → propose → interrupt() → apply] | END
 *
 * Signaux : personnes « Prévenez-moi » sur un produit + ventes unitaires récentes.
 * L'agent chiffre un groupe (minimum, cible, durée, prix attendu au palier) et rédige
 * l'accroche ; l'admin valide dans /admin/copilot, puis le groupe est ouvert et annoncé.
 */

import { StateGraph, Annotation, START, END, interrupt } from '@langchain/langgraph'
import { z } from 'zod'
import mongoose from 'mongoose'
import Product from '@/lib/models/Product'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import GroupInterest from '@/lib/models/GroupInterest'
import SourcingRequest from '@/lib/models/SourcingRequest'
import AgentDecision from '@/lib/models/AgentDecision'
import { readPaymentSettings } from '@/lib/payments/settings'
import { announceNewGroup } from '@/lib/group-orders/announce'
import { notifyAdmins } from '@/lib/notify'
import { MARKET_BRAND } from '@/lib/branding'
import { getAgentModel } from '../llm'
import { getCheckpointer } from '../checkpointer'

const DAY = 86_400_000

const SeedState = Annotation.Root({
  productId: Annotation<string>,
  runId: Annotation<string>,
  product: Annotation<any>,
  signals: Annotation<any>,
  plan: Annotation<any>,
  pitch: Annotation<any>,
  decisionId: Annotation<string>,
  humanDecision: Annotation<any>,
})

const PitchSchema = z.object({
  description: z.string().max(600),
  reasons: z.array(z.string()).max(4),
})

async function loadContext(state: typeof SeedState.State) {
  const product = await Product.findById(state.productId).lean() as any
  if (!product) throw new Error(`Produit ${state.productId} introuvable`)
  const since = new Date(Date.now() - 30 * DAY)
  const [interested, sales, sourcing] = await Promise.all([
    GroupInterest.countDocuments({ scope: String(product._id), notified: false }),
    Order.aggregate([
      { $match: { paymentStatus: 'completed', createdAt: { $gte: since }, 'items.id': String(product._id) } },
      { $unwind: '$items' },
      { $match: { 'items.id': String(product._id) } },
      { $group: { _id: null, orders: { $sum: 1 }, units: { $sum: '$items.qty' } } },
    ]),
    SourcingRequest.aggregate([
      { $match: { productId: String(product._id), createdAt: { $gte: new Date(Date.now() - 60 * DAY) } } },
      { $group: { _id: null, requests: { $sum: 1 }, units: { $sum: { $ifNull: ['$qty', 1] } } } },
    ]),
  ])
  return {
    product,
    signals: {
      interested,
      orders30d: sales[0]?.orders || 0,
      units30d: sales[0]?.units || 0,
      sourcingRequests60d: sourcing[0]?.requests || 0,
      sourcingUnits60d: sourcing[0]?.units || 0,
    },
  }
}

/** Plan chiffré à partir des réglages d'achats groupés et des paliers de prix du produit. */
async function plan(state: typeof SeedState.State) {
  const p = state.product
  const s = state.signals
  const rules = readPaymentSettings().groupOrders.rules
  const minQty = Math.max(1, p.groupBuyMinQty || rules.defaultMinQty)
  const targetQty = Math.max(minQty, p.groupBuyTargetQty || rules.defaultTargetQty)
  // Demande estimée : intéressés (2 pièces chacun, prudence) + rythme des ventes unitaires + moitié des quantités demandées en sourcing.
  const durationDays = rules.defaultDeadlineDays
  const expectedUnits = Math.round(s.interested * 2 + (s.units30d / 30) * durationDays + (s.sourcingUnits60d || 0) / 2)
  const tiers = Array.isArray(p.priceTiers) ? [...p.priceTiers].sort((a: any, b: any) => a.minQty - b.minQty) : []
  const priceAt = (qty: number) => tiers.filter((t: any) => qty >= t.minQty).pop()?.price ?? p.price
  const allowed = Object.entries(rules.allowedShippingMethods).filter(([, on]) => on).map(([m]) => m)
  return {
    plan: {
      minQty, targetQty, durationDays, expectedUnits,
      shippingMethod: allowed[0] || 'maritime_60j',
      basePrice: p.price,
      priceAtMin: priceAt(minQty),
      priceAtTarget: priceAt(targetQty),
      likelyToFill: expectedUnits >= minQty,
    },
  }
}

function gate(state: typeof SeedState.State) {
  const p = state.product
  // Produit retiré entre la détection et l'analyse, ou demande trop faible pour un groupe crédible.
  if (!p.isPublished || state.plan.expectedUnits < Math.ceil(state.plan.minQty / 2)) return END
  return 'pitch'
}

async function pitch(state: typeof SeedState.State) {
  const p = state.product
  const pl = state.plan
  const s = state.signals
  const fallback = {
    description: `Achat groupé ${p.name} : plus nous sommes nombreux, plus le prix baisse, jusqu'à ${Math.round(pl.priceAtTarget).toLocaleString('fr-FR')} FCFA la pièce à ${pl.targetQty} pièces. Commande unique depuis l'usine, livraison groupée à Dakar.`,
    reasons: [
      `${s.interested} personne(s) attendent un groupe sur ce produit`,
      `${s.units30d} pièce(s) vendue(s) à l'unité en 30 jours`,
      ...(s.sourcingRequests60d ? [`${s.sourcingRequests60d} demande(s) « Trouvez-moi » sur ce produit en 60 jours`] : []),
    ],
    llmUnavailable: true,
  }
  const model = getAgentModel()
  if (!model) return { pitch: fallback }
  try {
    const out = await model.withStructuredOutput(PitchSchema).invoke([
      { role: 'system', content: 'Tu écris pour une marketplace sénégalaise d\'import Chine. Ton clair, honnête, sans emoji, sans promesse de délai ou de prix non garantis.' },
      {
        role: 'user', content: `Rédige la description (max 550 caractères) d'un achat groupé pour : ${p.name} (${p.category || 'divers'}).
Prix unitaire normal ${p.price} FCFA ; ${Math.round(pl.priceAtMin)} FCFA au minimum de ${pl.minQty} pièces ; ${Math.round(pl.priceAtTarget)} FCFA à ${pl.targetQty} pièces.
Durée ${pl.durationDays} jours. Signaux : ${JSON.stringify(s)}.
Donne aussi 2 à 4 raisons factuelles de lancer ce groupe.`,
      },
    ])
    return { pitch: { ...out, llmUnavailable: false } }
  } catch (e) {
    console.error('[agent/group-seeding] pitch failed:', e)
    return { pitch: fallback }
  }
}

async function propose(state: typeof SeedState.State) {
  const p = state.product
  const pl = state.plan
  const s = state.signals
  const decision = await AgentDecision.create({
    type: 'group_order_seeding',
    refId: state.productId,
    runId: state.runId,
    status: 'pending',
    proposal: {
      verdict: pl.likelyToFill ? 'approve' : 'unsure',
      confidence: pl.likelyToFill ? 0.7 : 0.45,
      reasons: [
        `Demande estimée : ${pl.expectedUnits} pièce(s) sur ${pl.durationDays} j (minimum ${pl.minQty})`,
        ...(state.pitch?.reasons || []),
      ].slice(0, 5),
      suggestedFixes: [
        `Ouvrir un groupe ${pl.minQty} → ${pl.targetQty} pièces, ${pl.durationDays} jours`,
        `Prix : ${Math.round(pl.priceAtMin).toLocaleString('fr-FR')} F au minimum, ${Math.round(pl.priceAtTarget).toLocaleString('fr-FR')} F à la cible`,
        `Annonce automatique aux ${s.interested} intéressé(s)`,
      ],
      riskFlags: pl.likelyToFill ? [] : ['demande estimée sous le minimum'],
      draftMessage: state.pitch?.description,
      plan: pl,
      signals: s,
      llmUnavailable: !!state.pitch?.llmUnavailable,
      product: { name: p.name, image: p.image || p.gallery?.[0], price: p.price, category: p.category },
    },
  })
  await notifyAdmins({
    type: 'info',
    title: 'Achat groupé à lancer (IA)',
    message: `« ${p.name} » : ${s.interested} intéressé(s), ${s.units30d} vente(s) en 30 j. Proposition ${pl.minQty} → ${pl.targetQty} pièces.`,
    actionUrl: '/admin/copilot',
    metadata: { decisionId: String(decision._id), productId: state.productId },
    push: false,
  })
  return { decisionId: String(decision._id) }
}

async function humanReview(state: typeof SeedState.State) {
  const decision = interrupt({ kind: 'await_admin', decisionId: state.decisionId })
  return { humanDecision: decision }
}

function generateGroupId(): string {
  return `GRP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

async function apply(state: typeof SeedState.State) {
  const decision = state.humanDecision as { action?: string; note?: string; decidedBy?: string } | undefined
  const approved = decision?.action === 'approve'
  let groupId: string | undefined

  if (approved) {
    const p = await Product.findById(state.productId).lean() as any
    const alreadyOpen = await GroupOrder.exists({ 'product.productId': new mongoose.Types.ObjectId(state.productId), status: { $in: ['draft', 'open'] } })
    // Produit dépublié ou groupe déjà ouvert pendant l'attente de décision : rien à créer.
    if (p?.isPublished && !alreadyOpen) {
      const pl = state.plan
      const created = await GroupOrder.create({
        groupId: generateGroupId(),
        status: 'open',
        product: { productId: p._id, name: p.name, image: p.image, basePrice: p.price, currency: p.currency || 'FCFA' },
        minQty: pl.minQty,
        targetQty: pl.targetQty,
        currentQty: 0,
        priceTiers: Array.isArray(p.priceTiers) ? p.priceTiers : [],
        currentUnitPrice: p.price,
        participants: [],
        maxParticipants: readPaymentSettings().groupOrders.rules.maxParticipantsPerGroup,
        deadline: new Date(Date.now() + pl.durationDays * DAY),
        shippingMethod: pl.shippingMethod,
        description: state.pitch?.description,
        internalNotes: `Ouvert par l'agent group_order_seeding, validé par ${decision?.decidedBy || 'admin'}${decision?.note ? ` : ${decision.note}` : ''}`,
        createdBy: { name: MARKET_BRAND.name, phone: MARKET_BRAND.whatsapp.replace(/\s/g, '') },
      })
      groupId = created.groupId
      await announceNewGroup(created.groupId).catch((e: any) => console.warn('[agent/group-seeding] annonce:', e?.message))
    }
  }

  await AgentDecision.updateOne(
    { _id: state.decisionId },
    { $set: { status: approved ? 'approved' : 'rejected', adminNote: decision?.note, decidedAt: new Date(), ...(groupId ? { 'proposal.createdGroupId': groupId } : {}) } }
  )
  return {}
}

let compiled: ReturnType<typeof build> | null = null

function build() {
  return new StateGraph(SeedState)
    .addNode('loadContext', loadContext)
    .addNode('plan', plan)
    .addNode('pitch', pitch)
    .addNode('propose', propose)
    .addNode('humanReview', humanReview)
    .addNode('apply', apply)
    .addEdge(START, 'loadContext')
    .addEdge('loadContext', 'plan')
    .addConditionalEdges('plan', gate, ['pitch', END])
    .addEdge('pitch', 'propose')
    .addEdge('propose', 'humanReview')
    .addEdge('humanReview', 'apply')
    .addEdge('apply', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getGroupSeedingGraph() {
  if (!compiled) compiled = build()
  return compiled
}
