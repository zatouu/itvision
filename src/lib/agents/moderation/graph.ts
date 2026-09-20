/**
 * Graphe LangGraph « product_moderation » — voir docs/DAT_AGENTS_IA.md.
 *
 * loadContext → runChecks → gate → [analyze LLM | propose] → interrupt() → apply
 *
 * L'agent recommande, l'humain décide : interrupt() fige le graphe jusqu'à
 * la décision admin dans /admin/copilot, puis Command({resume}) le réveille.
 */

import { StateGraph, Annotation, START, END, interrupt } from '@langchain/langgraph'
import { z } from 'zod'
import mongoose from 'mongoose'
import Product from '@/lib/models/Product'
import { Order } from '@/lib/models/Order'
import ReturnRequest from '@/lib/models/ReturnRequest'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import ShopFollower from '@/lib/models/ShopFollower'
import AgentDecision from '@/lib/models/AgentDecision'
import { notifyUser, notifyAdmins } from '@/lib/notify'
import { getAgentModel } from '../llm'
import { getCheckpointer } from '../checkpointer'
import { runDeterministicChecks } from './checks'

const ModerationState = Annotation.Root({
  productId: Annotation<string>,
  runId: Annotation<string>,
  product: Annotation<any>,
  vendor: Annotation<any>,
  checks: Annotation<any>,
  analysis: Annotation<any>,
  decisionId: Annotation<string>,
  humanDecision: Annotation<any>,
})

const AnalysisSchema = z.object({
  verdict: z.enum(['approve', 'reject', 'unsure']),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).max(5),
  suggestedFixes: z.array(z.string()).max(5),
  riskFlags: z.array(z.string()).max(5),
})

async function loadContext(state: typeof ModerationState.State) {
  const product = await Product.findById(state.productId).lean() as any
  if (!product) throw new Error(`Produit ${state.productId} introuvable`)

  const vendor = product.sellerSlug
    ? await VendorProfile.findOne({ slug: product.sellerSlug }).lean() as any
    : null
  const shop = vendor
    ? await Shop.findOne({ slug: vendor.slug }).select('status isVerified createdAt').lean() as any
    : null

  // Stats vendeur : taille catalogue, ventes, litiges, ancienneté
  let salesCount = 0
  let disputeCount = 0
  let catalogSize = 0
  if (vendor) {
    const productIds = await Product.find({ sellerSlug: vendor.slug }).select('_id').limit(500).lean()
    const ids = productIds.map(p => String(p._id))
    catalogSize = ids.length
    ;[salesCount, disputeCount] = await Promise.all([
      Order.countDocuments({ 'items.productId': { $in: ids }, paymentStatus: 'completed' }),
      ReturnRequest.countDocuments({ productId: { $in: ids } }),
    ])
  }

  return {
    product,
    vendor: {
      slug: vendor?.slug,
      name: vendor?.name || product.sellerName,
      userId: vendor?.userId ? String(vendor.userId) : null,
      shopId: product.shopId ? String(product.shopId) : null,
      shopStatus: shop?.status,
      isVerified: !!shop?.isVerified,
      catalogSize,
      salesCount,
      disputeCount,
      accountAgeDays: shop?.createdAt
        ? Math.floor((Date.now() - new Date(shop.createdAt).getTime()) / 86400000)
        : null,
    },
  }
}

async function runChecks(state: typeof ModerationState.State) {
  const checks = await runDeterministicChecks(state.product)
  return { checks }
}

function gateAfterChecks(state: typeof ModerationState.State) {
  return state.checks?.hardViolation ? 'propose' : 'analyze'
}

async function analyze(state: typeof ModerationState.State) {
  const model = getAgentModel()
  if (!model) {
    return { analysis: { verdict: 'unsure', confidence: 0, reasons: ['Analyse IA indisponible (pas de clé LLM)'], suggestedFixes: [], riskFlags: [], llmUnavailable: true } }
  }

  const p = state.product
  const v = state.vendor
  const c = state.checks
  const structured = model.withStructuredOutput(AnalysisSchema)

  const prompt = `Tu es modérateur d'une marketplace B2B/B2C sénégalaise (DDM+, import Chine). Évalue ce produit soumis par un vendeur local.

PRODUIT : ${JSON.stringify({ name: p.name, description: (p.description || '').slice(0, 800), price: p.price, currency: 'FCFA', category: p.category, condition: p.condition, photos: (p.gallery || []).length, variants: (p.variantGroups || []).length })}
VENDEUR : ${JSON.stringify({ name: v.name, boutiqueVerifiee: v.isVerified, statutBoutique: v.shopStatus, ventes: v.salesCount, litiges: v.disputeCount, ancienneteJours: v.accountAgeDays })}
CHECKS : ${JSON.stringify(c)}

Règles métier : prix en FCFA (sensible : 1000 F ≈ 1,5 €). Suspect si prix anormalement bas pour la catégorie (contrefaçon/arnaque), description vide avec prix élevé, catégorie incohérente.
Réponds en français. verdict: approve si la fiche est publiable, reject si elle viole les règles, unsure si tu doutes (l'humain tranchera).`

  try {
    const analysis = await structured.invoke([
      { role: 'system', content: 'Tu es un modérateur rigoureux. Tu réponds uniquement via le format structuré demandé.' },
      { role: 'user', content: prompt },
    ])
    return { analysis: { ...analysis, llmUnavailable: false } }
  } catch (e) {
    console.error('[agent/moderation] analyze failed:', e)
    return { analysis: { verdict: 'unsure', confidence: 0, reasons: ['Analyse IA en échec (timeout/erreur)'], suggestedFixes: [], riskFlags: ['llm_error'], llmUnavailable: true } }
  }
}

async function propose(state: typeof ModerationState.State) {
  const c = state.checks || {}
  const a = state.analysis || {}
  const p = state.product

  // Proposition finale : violation dure > LLM > défaut unsure
  let verdict = a.verdict || 'unsure'
  let reasons: string[] = a.reasons || []
  let suggestedFixes: string[] = a.suggestedFixes || []
  let confidence = a.confidence ?? 0

  if (c.hardViolation) {
    verdict = 'reject'
    confidence = 1
    reasons = [c.hardViolation]
    suggestedFixes = c.hardViolation.startsWith('Aucune photo')
      ? ['Ajouter au moins une photo du produit']
      : []
  }
  if (c.priceVsMedian != null && (c.priceVsMedian < 0.1 || c.priceVsMedian > 20)) {
    reasons = [...reasons, `Prix atypique vs médiane catégorie (×${c.priceVsMedian.toFixed(2)})`]
  }

  const decision = await AgentDecision.create({
    type: 'product_moderation',
    refId: state.productId,
    runId: state.runId,
    status: 'pending',
    proposal: {
      verdict,
      confidence,
      reasons,
      suggestedFixes,
      riskFlags: a.riskFlags || [],
      checks: c,
      llmUnavailable: !!a.llmUnavailable,
      product: {
        name: p.name,
        price: p.price,
        category: p.category,
        image: p.image || p.gallery?.[0],
        sellerName: state.vendor?.name,
      },
    },
  })

  await notifyAdmins({
    type: 'info',
    title: 'Produit à modérer (IA)',
    message: `« ${p.name} » — reco : ${verdict === 'approve' ? 'publier' : verdict === 'reject' ? 'rejeter' : 'revue manuelle'}${confidence ? ` (${Math.round(confidence * 100)}%)` : ''}.`,
    actionUrl: '/admin/copilot',
    metadata: { decisionId: String(decision._id), productId: state.productId },
    push: false,
  })

  return { decisionId: String(decision._id) }
}

async function humanReview(state: typeof ModerationState.State) {
  // ⏸ Le graphe se fige ici — repris par Command({resume}) depuis l'API admin.
  const decision = interrupt({ kind: 'await_admin', decisionId: state.decisionId })
  return { humanDecision: decision }
}

async function apply(state: typeof ModerationState.State) {
  const decision = state.humanDecision as { action?: string; note?: string } | undefined
  const approved = decision?.action === 'approve'
  const p = state.product
  const v = state.vendor

  if (approved) {
    await Product.updateOne({ _id: p._id }, { $set: { isPublished: true } })
    if (v.userId) {
      await notifyUser(v.userId, {
        type: 'success',
        title: 'Produit publié',
        message: `« ${p.name} » est en ligne sur votre vitrine.`,
        actionUrl: '/espace-vendeur',
        metadata: { productId: state.productId },
      })
    }
    // Notifier les abonnés de la boutique (cap 200)
    if (v.shopId) {
      const followers = await ShopFollower.find({ shopId: new mongoose.Types.ObjectId(v.shopId) }).select('userId').limit(200).lean()
      await Promise.allSettled(
        followers.map(f =>
          notifyUser(String((f as any).userId), {
            type: 'info',
            title: `${v.name} a publié un produit`,
            message: `« ${p.name} » — ${Number(p.price).toLocaleString('fr-FR')} F`,
            actionUrl: `/boutiques/${v.slug}`,
            metadata: { productId: state.productId },
            push: true,
          })
        )
      )
    }
  } else {
    if (v.userId) {
      await notifyUser(v.userId, {
        type: 'error',
        title: 'Produit refusé',
        message: `« ${p.name} » n'a pas été publié : ${decision?.note || 'non conforme aux règles de la marketplace'}.`,
        actionUrl: '/espace-vendeur',
        metadata: { productId: state.productId },
      })
    }
  }

  await AgentDecision.updateOne(
    { _id: state.decisionId },
    { $set: { status: approved ? 'approved' : 'rejected', adminNote: decision?.note, decidedAt: new Date() } }
  )
  return {}
}

let compiled: ReturnType<typeof build> | null = null

function build() {
  return new StateGraph(ModerationState)
    .addNode('loadContext', loadContext)
    .addNode('runChecks', runChecks)
    .addNode('analyze', analyze)
    .addNode('propose', propose)
    .addNode('humanReview', humanReview)
    .addNode('apply', apply)
    .addEdge(START, 'loadContext')
    .addEdge('loadContext', 'runChecks')
    .addConditionalEdges('runChecks', gateAfterChecks)
    .addEdge('analyze', 'propose')
    .addEdge('propose', 'humanReview')
    .addEdge('humanReview', 'apply')
    .addEdge('apply', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getModerationGraph() {
  if (!compiled) compiled = build()
  return compiled
}
