/**
 * Graphe LangGraph « sourcing_request » — automatisation du « trouvez-moi ».
 * Voir docs/DAT_AGENTS_IA.md.
 *
 * Déclenché à la création d'une SourcingRequest (photo/lien/texte client) :
 *
 * loadRequest → understand → search → extract → score → route
 *   route = autoSend (pertinence ≥ seuil admin + budget respecté → SMS client, sans humain)
 *         | deferRetry (sites sources bloqués → nouvel essai dans 2 h, 3 fois max)
 *         | propose → interrupt() → apply (validation admin = envoi direct au client)
 *
 * understand lit la photo (vision) quand le texte client est trop vague ; score classe
 * les candidats par pertinence (LLM, repli mots-clés) puis par prix livré transparent
 * (coût + frais service + assurance + transport).
 */

import { StateGraph, Annotation, START, END, interrupt } from '@langchain/langgraph'
import { z } from 'zod'
import SourcingRequest from '@/lib/models/SourcingRequest'
import AgentDecision from '@/lib/models/AgentDecision'
import { ExternalSearchLog } from '@/lib/models/ExternalSearchLog'
import { notifyAdmins } from '@/lib/notify'
import { getAppConfig } from '@/lib/wallet'
import { qwenVision } from '@/lib/ai/qwen'
import { absoluteUrl, deliverSourcingProposalNotification, pendingSourcingProposalNotification } from '@/lib/market/sourcing-proposal'
import { getAgentModel } from '../llm'
import { getCheckpointer } from '../checkpointer'
import { discoverSourceUrls, scrapeOneSource, isQualityProduct, closeSourcingBrowser } from './graph'
import { humanDelay, classifySourceUrl, Product1688, SourcePlatform } from '@/lib/browser-scraper'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import type { SharedPricingSnapshot } from '@/lib/pricing/shared-settings'
import { assessSourcingProposal, priceSourcingCandidate } from './request-policy'

const MAX_SEARCH_ATTEMPTS = 3
const RETRY_DELAY_MS = 2 * 3600_000
const MIN_RELEVANCE = 0.5

const MAX_CANDIDATES = 5
const EXTRACT_LIMIT = 8 // ~moitié des URLs moteurs sont délistées/mortes — on en tente plus

const RequestState = Annotation.Root({
  requestId: Annotation<string>,
  runId: Annotation<string>,
  request: Annotation<any>,
  query: Annotation<string>,
  directUrls: Annotation<string[]>,
  offerUrls: Annotation<string[]>,
  candidates: Annotation<Product1688[]>,
  blockedReason: Annotation<string | undefined>,
  platformOutcomes: Annotation<Partial<Record<SourcePlatform, 'success' | 'blocked' | 'no_results' | 'error'>>>,
  suggestion: Annotation<any>,
  decisionId: Annotation<string>,
  humanDecision: Annotation<any>,
  autoSend: Annotation<{ enabled: boolean; minRelevance: number }>,
  singleImportServiceFeeRate: Annotation<number | undefined>,
  pricingSnapshot: Annotation<SharedPricingSnapshot>,
  pricingPinned: Annotation<boolean>,
  retryLater: Annotation<boolean>,
})

const RelevanceSchema = z.object({
  scores: z.array(z.object({ index: z.number().int(), relevance: z.number().min(0).max(1), reason: z.string().max(120) })),
})

async function loadRequest(state: typeof RequestState.State) {
  const request = await SourcingRequest.findById(state.requestId).lean() as any
  if (!request) throw new Error(`SourcingRequest ${state.requestId} introuvable`)
  if (['fulfilled', 'cancelled', 'accepted'].includes(request.status)) {
    throw new Error(`Demande déjà clôturée (${request.status})`)
  }

  // Construction de la query : titre > début de description > hint catégorie.
  // externalUrl 1688/AliExpress/Alibaba = fiche directe à traiter en priorité.
  const directUrls: string[] = []
  if (request.externalUrl && classifySourceUrl(request.externalUrl)) {
    directUrls.push(request.externalUrl)
  }

  const query = (request.title || request.description || request.categoryHint || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  if (!query && directUrls.length === 0 && !request.imageUrl) {
    throw new Error('Demande sans titre/description/photo — rien à chercher')
  }

  const cfg: any = await getAppConfig()
  const autoSend = {
    enabled: cfg.integrations?.sourcingAutoSend?.enabled === true && state.pricingPinned === true,
    minRelevance: Number(cfg.integrations?.sourcingAutoSend?.minRelevance) || 0.8,
  }
  return { request, query, directUrls, autoSend, retryLater: false, platformOutcomes: {} }
}

/** Photo + texte vague (« ça », « ce modèle »…) : la vision déduit les mots-clés de recherche. */
async function understand(state: typeof RequestState.State) {
  const req = state.request
  if (state.directUrls.length > 0 || !req.imageUrl || state.query.length >= 15) return {}
  if (req.aiQuery) return { query: `${state.query} ${req.aiQuery}`.trim().slice(0, 120) }
  try {
    const res = await qwenVision(
      'Tu aides un acheteur à retrouver ce produit chez un fournisseur chinois. Réponds uniquement par 4 à 10 mots-clés de recherche en français (type de produit, matière, caractéristiques visibles, usage), sans phrase ni ponctuation.',
      [absoluteUrl(req.imageUrl)]
    )
    const keywords = (res.text || '').replace(/[\n\r]+/g, ' ').replace(/[^\p{L}\p{N} \-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
    if (!keywords) return {}
    await SourcingRequest.updateOne({ _id: state.requestId }, { $set: { aiQuery: keywords } })
    return { query: `${state.query} ${keywords}`.trim().slice(0, 120) }
  } catch (e: any) {
    console.warn('[sourcing-request] lecture photo impossible:', e?.message)
    if (!state.query) throw new Error('Photo illisible par l\'IA et aucun texte — recherche manuelle')
    return {}
  }
}

async function search(state: typeof RequestState.State) {
  if (state.directUrls.length > 0) {
    return { offerUrls: state.directUrls, candidates: [] as Product1688[] }
  }
  const { urls, blockedReason } = await discoverSourceUrls(state.query, EXTRACT_LIMIT + 4)
  return { offerUrls: urls, candidates: [] as Product1688[], blockedReason }
}

function gateAfterSearch(state: typeof RequestState.State) {
  if (state.offerUrls.length > 0) return 'extract'
  return canRetry(state) ? 'deferRetry' : 'propose'
}

function canRetry(state: typeof RequestState.State) {
  return !!state.blockedReason && (state.request?.autoSearchAttempts || 0) + 1 < MAX_SEARCH_ATTEMPTS
}

async function extract(state: typeof RequestState.State) {
  const candidates: Product1688[] = []
  const platformOutcomes: Partial<Record<SourcePlatform, 'success' | 'blocked' | 'no_results' | 'error'>> = {}
  let blockedReason: string | undefined
  const blockedPlatforms = new Set<SourcePlatform>()

  for (const url of state.offerUrls) {
    if (candidates.length >= MAX_CANDIDATES) break
    const platform = classifySourceUrl(url)
    if (platform && blockedPlatforms.has(platform)) continue
    if (candidates.length > 0) await humanDelay(3000, 7000)
    const startedAt = Date.now()
    const result = await scrapeOneSource(url)
    console.log(`[sourcing-request] ${result.success ? '✓' : '✗'} ${url} (${Math.round((Date.now() - startedAt) / 1000)}s)`)
    const q = isQualityProduct(result.data)
    if (result.success && q.ok) {
      if (platform) platformOutcomes[platform] = 'success'
      if (q.cleanedName) result.data!.name = q.cleanedName
      candidates.push(result.data!)
    } else {
      if (platform && platformOutcomes[platform] !== 'success') platformOutcomes[platform] = result.success ? 'no_results' : 'error'
      if (result.success) {
        console.log(`[sourcing-request] skip qualité ${url} (nameOk=${q.nameOk} priceOk=${q.priceOk} name="${result.data?.name?.slice(0, 40)}" price=${result.data?.price1688})`)
      }
      if (!result.success && /captcha|login|blocked|verify/i.test(result.error || '')) {
        blockedReason = result.error
        if (platform) blockedPlatforms.add(platform)
        if (platform && platformOutcomes[platform] !== 'success') platformOutcomes[platform] = 'blocked'
      }
    }
  }
  return { candidates, blockedReason, platformOutcomes }
}

/** Prix client estimé — même formule que la route proposal :
 *  coût (prix source × taux devise × qté) + frais service + assurance
 *  + transport aérien éco. Le taux dépend de la devise source
 *  (CNY=1688, USD/EUR=AliExpress/Alibaba). Puis pertinence vs la demande. */
async function score(state: typeof RequestState.State) {
  const qty = Math.max(1, state.request?.qty || 1)
  const rate = BASE_SHIPPING_RATES.air_15 // aérien économique = défaut proposition

  const priced = state.candidates.map((p) => {
    const platform = p.platform || '1688'
    const pricing = priceSourcingCandidate(p, qty, state.pricingSnapshot)
    const assessment = assessSourcingProposal(state.request, p, pricing.totalClientPrice)
    return { product: p, platform, ...pricing, ...assessment, relevance: 0, relevanceReason: '' }
  })
  const relevances = await rateRelevance(state, priced.map((s) => s.product))
  priced.forEach((s, i) => { s.relevance = relevances[i]?.relevance ?? 0; s.relevanceReason = relevances[i]?.reason || '' })

  // Parmi les plus pertinents (à 0,1 près du meilleur), le moins cher livré.
  const topRel = priced.reduce((m, s) => Math.max(m, s.relevance), 0)
  const band = priced.filter((s) => s.relevance >= Math.max(MIN_RELEVANCE, topRel - 0.1))
  const eligible = band.filter(candidate => candidate.riskFlags.length === 0)
  const pool = eligible.length ? eligible : band.length ? band : priced
  const best = pool.reduce((a, b) => (b.totalClientPrice < a.totalClientPrice ? b : a), pool[0])
  const scored = [...priced].sort((a, b) => b.relevance - a.relevance || a.totalClientPrice - b.totalClientPrice)
  return {
    suggestion: best
      ? {
          relevance: best.relevance,
          relevanceReason: best.relevanceReason,
          withinBudget: best.withinBudget,
          riskFlags: best.riskFlags,
          candidates: scored.map((s) => ({
            name: s.product.name,
            url: s.product.productUrl,
            image: s.product.image || s.product.gallery?.[0],
            supplier: s.product.supplier?.name,
            platform: s.platform,
            price1688: s.product.price1688,
            sourceCurrency: s.sourceCurrency,
            totalClientPrice: s.totalClientPrice,
            relevance: Math.round(s.relevance * 100) / 100,
          })),
          best: {
            productName: best.product.name,
            productImage: best.product.image || best.product.gallery?.[0],
            productGallery: (best.product.gallery || []).slice(0, 8),
            supplierUrl: best.product.productUrl,
            supplierName: best.product.supplier?.name,
            sourcePlatform: best.platform,
            price1688: best.product.price1688,
            sourceCurrency: best.sourceCurrency,
            exchangeRate: best.exchangeRate,
            productCostFCFA: best.productCostFCFA,
            serviceFeeRate: best.serviceFeeRate,
            serviceFeeAmount: best.serviceFeeAmount,
            insuranceRate: best.insuranceRate,
            insuranceAmount: best.insuranceAmount,
            shippingMethod: 'air_economy',
            shippingCost: best.shippingCost,
            totalClientPrice: best.totalClientPrice,
            qty,
            weightKg: best.product.weightKg || 1,
            lengthCm: best.product.lengthCm,
            widthCm: best.product.widthCm,
            heightCm: best.product.heightCm,
            deliveryDays: rate.durationDays,
          },
        }
      : null,
  }
}

/** Pertinence 0–1 de chaque candidat vs la demande ; sans LLM, 0 (jamais d'envoi automatique à l'aveugle). */
async function rateRelevance(state: typeof RequestState.State, products: Product1688[]) {
  const model = getAgentModel()
  if (!model || products.length === 0) return products.map(() => ({ relevance: 0, reason: 'pertinence non évaluée' }))
  const req = state.request
  try {
    const out = await model.withStructuredOutput(RelevanceSchema).invoke([
      { role: 'system', content: 'Tu vérifies si des fiches fournisseurs (souvent en chinois) correspondent à la demande d\'un client. Sois strict : 1 = même produit, 0.7 = très proche (variante), 0.4 = même famille, 0 = hors sujet.' },
      {
        role: 'user', content: `Demande client : ${JSON.stringify({ titre: req.title, description: (req.description || '').slice(0, 400), motsClesPhoto: req.aiQuery, quantite: req.qty, budgetFCFA: req.budgetMaxFCFA })}
Candidats : ${JSON.stringify(products.map((p, index) => ({ index, nom: p.name, prix: p.price1688, devise: p.price1688Currency || 'CNY' })))}
Note chaque candidat (index, relevance, reason courte en français).`,
      },
    ])
    return products.map((_, i) => {
      const s = out.scores.find((x) => x.index === i)
      return { relevance: s?.relevance ?? 0, reason: s?.reason || '' }
    })
  } catch (e: any) {
    console.warn('[sourcing-request] pertinence non évaluée:', e?.message)
    return products.map(() => ({ relevance: 0, reason: 'pertinence non évaluée' }))
  }
}

function routeAfterScore(state: typeof RequestState.State) {
  const s = state.suggestion
  if (!s && canRetry(state)) return 'deferRetry'
  if (s && Array.isArray(s.riskFlags) && s.riskFlags.length === 0 && state.autoSend?.enabled && s.relevance >= state.autoSend.minRelevance && s.withinBudget && s.best?.productImage) return 'autoSend'
  return 'propose'
}

/** Journal d'audit + résultats bruts sur la demande (page admin des recherches externes). */
async function recordSearch(state: typeof RequestState.State) {
  const req = state.request
  const candidates = state.suggestion?.candidates || []
  const byPlatform = new Map<SourcePlatform, any[]>()
  for (const c of candidates) {
    const pl = (c.platform || '1688') as SourcePlatform
    byPlatform.set(pl, [...(byPlatform.get(pl) || []), c])
  }
  // Une ligne par plateforme interrogée, même sans résultat : sert à l'indicateur de santé admin.
  const searched = new Set<SourcePlatform>(
    state.directUrls.length > 0
      ? (state.directUrls.map((u) => classifySourceUrl(u)).filter(Boolean) as SourcePlatform[])
      : ['1688', 'aliexpress', 'alibaba']
  )
  for (const pl of byPlatform.keys()) searched.add(pl)
  for (const platform of searched) {
    const list = byPlatform.get(platform) || []
    const logStatus = list.length > 0 ? 'success' : state.platformOutcomes?.[platform] || 'no_results'
    await ExternalSearchLog.create({
      imageUrl: req.imageUrl || `agent:${state.query.slice(0, 100)}`,
      description: req.description?.slice(0, 500),
      platform,
      status: logStatus,
      resultsCount: list.length,
      results: list.map((c: any) => ({
        title: c.name, price1688: c.price1688, image: c.image || '', url: c.url, supplier: c.supplier,
      })),
      errorMessage: logStatus === 'blocked' ? state.blockedReason : undefined,
    }).catch((e) => console.warn('[sourcing-request] log externe échoué:', e?.message))
  }
  if (candidates.length > 0) {
    await SourcingRequest.updateOne(
      { _id: state.requestId, status: { $in: ['new', 'searching'] } },
      {
        $set: {
          externalSearchResults: candidates.map((c: any) => ({
            title: c.name,
            price1688: c.price1688,
            sourceCurrency: c.sourceCurrency || 'CNY',
            image: c.image || '',
            url: c.url,
            supplier: c.supplier,
            platform: c.platform || '1688',
            searchedAt: new Date(),
          })),
          status: 'searching',
        },
      }
    )
  }
  return byPlatform
}

/** Écrit la proposition et prévient le client par SMS ; ne remplace jamais une proposition déjà envoyée. */
async function sendProposal(state: typeof RequestState.State, notes: string, proposedByName: string): Promise<boolean> {
  const b = state.suggestion.best
  const now = new Date()
  const res = await SourcingRequest.updateOne(
    { _id: state.requestId, status: { $in: ['new', 'searching', 'proposal_ready'] } },
    {
      $set: {
        status: 'proposal_sent',
        proposalSentAt: now,
        proposalNotification: pendingSourcingProposalNotification(),
        proposal: {
          ...b,
          currency: 'FCFA',
          notes,
          proposedBy: 'agent',
          proposedByName,
          proposedAt: now,
          expiresAt: new Date(now.getTime() + 72 * 3600 * 1000),
        },
      },
    }
  )
  if (res.modifiedCount !== 1) return false
  await deliverSourcingProposalNotification(state.requestId).catch(() => {
    console.warn('[sourcing] notification persistée, en attente de reprise pour', state.requestId)
  })
  return true
}

async function autoSend(state: typeof RequestState.State) {
  const req = state.request
  const s = state.suggestion
  await recordSearch(state)
  const sent = await sendProposal(state, `Proposition envoyée automatiquement (pertinence ${Math.round(s.relevance * 100)} %) : ${s.relevanceReason}`, 'Agent sourcing (IA)')
  await AgentDecision.create({
    type: 'sourcing_request',
    refId: state.requestId,
    runId: state.runId,
    status: 'auto_approved',
    decidedBy: 'agent',
    decidedAt: new Date(),
    proposal: {
      verdict: 'approve',
      confidence: s.relevance,
      reasons: [`Envoyée au client sans validation : pertinence ${Math.round(s.relevance * 100)} % ≥ seuil ${Math.round(state.autoSend.minRelevance * 100)} %`, s.relevanceReason].filter(Boolean),
      suggestedFixes: [],
      riskFlags: sent ? [] : ['proposition déjà envoyée entre-temps : rien n\'a été remplacé'],
      checks: { autoSearch: true, autoSent: sent, candidatesFound: s.candidates.length },
      product: { name: s.best.productName, price: s.best.totalClientPrice, image: s.best.productImage, sellerName: s.best.supplierName },
      sourcingRequest: { reference: req.reference, description: (req.description || '').slice(0, 300), qty: req.qty, budgetMaxFCFA: req.budgetMaxFCFA, candidates: s.candidates, suggestedProposal: s.best },
    },
  })
  if (sent) {
    await notifyAdmins({
      type: 'success',
      title: `Trouvez-moi ${req.reference} — proposition envoyée par l'agent`,
      message: `« ${s.best.productName.slice(0, 60)} » à ${s.best.totalClientPrice.toLocaleString('fr-FR')} F livré, pertinence ${Math.round(s.relevance * 100)} %.`,
      actionUrl: '/admin/copilot',
      metadata: { requestId: state.requestId, reference: req.reference },
      push: false,
    })
  }
  await closeSourcingBrowser()
  return {}
}

/** Sites sources bloqués (captcha) : on réessaie plus tard au lieu de passer la main tout de suite. */
async function deferRetry(state: typeof RequestState.State) {
  await recordSearch(state)
  await SourcingRequest.updateOne({ _id: state.requestId, status: { $in: ['new', 'searching'] } }, { $inc: { autoSearchAttempts: 1 }, $set: { status: 'searching' } })
  await closeSourcingBrowser()
  return { retryLater: true }
}

export const SOURCING_RETRY_DELAY_MS = RETRY_DELAY_MS

async function propose(state: typeof RequestState.State) {
  const req = state.request
  const candidates = state.suggestion?.candidates || []

  // Idempotence : en cas de retry du job (même runId = jobId), réutiliser
  // la décision existante plutôt que créer un doublon dans la file admin.
  const existing = await AgentDecision.findOne({ runId: state.runId, status: 'pending' }).lean() as any
  if (existing) return { decisionId: String(existing._id) }

  const byPlatform = await recordSearch(state)

  const decision = await AgentDecision.create({
    type: 'sourcing_request',
    refId: state.requestId,
    runId: state.runId,
    status: 'pending',
    proposal: {
      verdict: candidates.length > 0 ? 'approve' : 'unsure',
      confidence: candidates.length > 0 ? Math.max(0.3, state.suggestion?.relevance || 0) : 0,
      reasons: candidates.length > 0
        ? [
            `${candidates.length} candidat(s) trouvé(s) (${[...byPlatform.keys()].join(', ')})`,
            `Meilleur choix : ${state.suggestion.best.totalClientPrice.toLocaleString('fr-FR')} F livré, pertinence ${Math.round((state.suggestion.relevance || 0) * 100)} %${state.suggestion.relevanceReason ? ` (${state.suggestion.relevanceReason})` : ''}`,
            state.suggestion.withinBudget ? null : `Au-dessus du budget client (${Number(req.budgetMaxFCFA).toLocaleString('fr-FR')} F)`,
            state.blockedReason ? `Blocage partiel : ${state.blockedReason}` : null,
          ].filter(Boolean)
        : [state.blockedReason ? `Bloqué après ${MAX_SEARCH_ATTEMPTS} essais : ${state.blockedReason}` : 'Aucun candidat trouvé'],
      suggestedFixes: candidates.length > 0
        ? [state.suggestion?.riskFlags?.length ? 'Approuver = brouillon à vérifier dans la fiche demande, sans envoi client' : 'Approuver = proposition disponible et notification SMS programmée']
        : [],
      riskFlags: state.suggestion?.riskFlags || [],
      checks: { autoSearch: true, candidatesFound: candidates.length },
      product: state.suggestion?.best
        ? {
            name: state.suggestion.best.productName,
            price: state.suggestion.best.totalClientPrice,
            image: state.suggestion.best.productImage,
            sellerName: state.suggestion.best.supplierName,
          }
        : { name: req.title || 'Demande sourcing', price: 0, image: req.imageUrl },
      sourcingRequest: {
        reference: req.reference,
        description: (req.description || '').slice(0, 300),
        qty: req.qty,
        budgetMaxFCFA: req.budgetMaxFCFA,
        candidates,
        suggestedProposal: state.suggestion?.best || null,
      },
    },
  })

  await notifyAdmins({
    type: candidates.length > 0 ? 'info' : 'warning',
    title: `Sourcing ${req.reference} — analyse agent`,
    message: candidates.length > 0
      ? `${candidates.length} candidats trouvés pour « ${req.title || req.description?.slice(0, 50)} » — proposition suggérée ${state.suggestion.best.totalClientPrice.toLocaleString('fr-FR')} F.`
      : `Aucun candidat automatique pour « ${req.title || req.description?.slice(0, 50)} » — recherche manuelle nécessaire.`,
    actionUrl: '/admin/copilot',
    metadata: { decisionId: String(decision._id), requestId: state.requestId, reference: req.reference },
    push: false,
  })

  return { decisionId: String(decision._id) }
}

async function humanReview(state: typeof RequestState.State) {
  const decision = interrupt({ kind: 'await_admin', decisionId: state.decisionId })
  return { humanDecision: decision }
}

async function apply(state: typeof RequestState.State) {
  const decision = state.humanDecision as { action?: string; note?: string; decidedBy?: string } | undefined
  const approved = decision?.action === 'approve'
  const req = state.request

  const needsReview = !Array.isArray(state.suggestion?.riskFlags) || state.suggestion.riskFlags.length > 0
  if (approved && state.suggestion?.best && needsReview) {
    const now = new Date()
    await SourcingRequest.updateOne(
      { _id: state.requestId, status: { $in: ['new', 'searching', 'proposal_ready'] } },
      { $set: {
        status: 'proposal_ready',
        adminNotes: `Vérification requise : ${(state.suggestion.riskFlags || ['Données fournisseur à confirmer']).join(' ; ')}`,
        proposal: {
          ...state.suggestion.best, currency: 'FCFA', proposedBy: 'agent', proposedByName: 'Agent sourcing (IA)',
          proposedAt: now, expiresAt: new Date(now.getTime() + 72 * 3600_000),
        },
      } }
    )
  } else if (approved && state.suggestion?.best) {
    // Validation admin = envoi direct au client (plus de second passage par la fiche demande).
    const sent = await sendProposal(
      state,
      `Proposition validée par ${decision?.decidedBy || 'admin'}${decision?.note ? ` — ${decision.note}` : ''}`,
      'Agent sourcing (IA)'
    )
    if (!sent) {
      await notifyAdmins({
        type: 'warning',
        title: `Trouvez-moi ${req.reference} — non envoyée`,
        message: 'Une proposition avait déjà été envoyée ou la demande est close : rien n\'a été remplacé.',
        actionUrl: '/admin/market/sourcing-requests',
        metadata: { requestId: state.requestId },
      })
    }
  } else {
    await SourcingRequest.updateOne(
      { _id: state.requestId, status: { $in: ['new', 'searching', 'proposal_ready'] } },
      { $set: { status: 'new', adminNotes: `Agent : pas de proposition automatique${decision?.note ? ` — ${decision.note}` : ''}` } }
    )
  }

  await AgentDecision.updateOne(
    { _id: state.decisionId },
    { $set: { status: approved ? 'approved' : 'rejected', adminNote: decision?.note, decidedBy: decision?.decidedBy, decidedAt: new Date() } }
  )
  await closeSourcingBrowser()
  return {}
}

let compiled: ReturnType<typeof build> | null = null

function build() {
  return new StateGraph(RequestState)
    .addNode('loadRequest', loadRequest)
    .addNode('understand', understand)
    .addNode('search', search)
    .addNode('extract', extract)
    .addNode('score', score)
    .addNode('autoSend', autoSend)
    .addNode('deferRetry', deferRetry)
    .addNode('propose', propose)
    .addNode('humanReview', humanReview)
    .addNode('apply', apply)
    .addEdge(START, 'loadRequest')
    .addEdge('loadRequest', 'understand')
    .addEdge('understand', 'search')
    .addConditionalEdges('search', gateAfterSearch, ['extract', 'deferRetry', 'propose'])
    .addEdge('extract', 'score')
    .addConditionalEdges('score', routeAfterScore, ['autoSend', 'deferRetry', 'propose'])
    .addEdge('autoSend', END)
    .addEdge('deferRetry', END)
    .addEdge('propose', 'humanReview')
    .addEdge('humanReview', 'apply')
    .addEdge('apply', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getSourcingRequestGraph() {
  if (!compiled) compiled = build()
  return compiled
}
