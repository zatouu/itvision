/**
 * Graphe LangGraph « sourcing_request » — automatisation du « trouvez-moi ».
 * Voir docs/DAT_AGENTS_IA.md.
 *
 * Déclenché à la création d'une SourcingRequest (photo/lien/texte client) :
 *
 * loadRequest → search → extract → score → propose → interrupt() → apply
 *
 * L'agent trouve des candidats 1688, calcule le prix client transparent
 * (coût + frais service + assurance + transport), pré-remplit
 * externalSearchResults et rédige un brouillon de proposition.
 * interrupt() → l'admin valide dans /admin/copilot → apply écrit le brouillon
 * proposal sur la demande (le formulaire admin existant se pré-remplit,
 * l'admin ajuste et envoie via la route proposal existante → SMS client).
 */

import { StateGraph, Annotation, START, END, interrupt } from '@langchain/langgraph'
import SourcingRequest from '@/lib/models/SourcingRequest'
import AgentDecision from '@/lib/models/AgentDecision'
import { notifyAdmins } from '@/lib/notify'
import { getCheckpointer } from '../checkpointer'
import { discover1688Urls, scrapeOne1688, isQualityProduct, closeSourcingBrowser } from './graph'
import { humanDelay, Product1688 } from '@/lib/browser-scraper'
import { BASE_SHIPPING_RATES } from '@/lib/logistics'
import { DEFAULT_EXCHANGE_RATE, DEFAULT_SERVICE_FEE_RATE, DEFAULT_INSURANCE_RATE } from '@/lib/pricing/constants'

const MAX_CANDIDATES = 5
const EXTRACT_LIMIT = 6 // on scrape un peu plus que nécessaire (certains échouent)

const RequestState = Annotation.Root({
  requestId: Annotation<string>,
  runId: Annotation<string>,
  request: Annotation<any>,
  query: Annotation<string>,
  directUrls: Annotation<string[]>,
  offerUrls: Annotation<string[]>,
  candidates: Annotation<Product1688[]>,
  blockedReason: Annotation<string | undefined>,
  suggestion: Annotation<any>,
  decisionId: Annotation<string>,
  humanDecision: Annotation<any>,
})

async function loadRequest(state: typeof RequestState.State) {
  const request = await SourcingRequest.findById(state.requestId).lean() as any
  if (!request) throw new Error(`SourcingRequest ${state.requestId} introuvable`)
  if (['fulfilled', 'cancelled', 'accepted'].includes(request.status)) {
    throw new Error(`Demande déjà clôturée (${request.status})`)
  }

  // Construction de la query : titre > début de description > hint catégorie.
  // externalUrl 1688 = fiche directe à traiter en priorité.
  const directUrls: string[] = []
  if (request.externalUrl && /detail\.1688\.com\/offer\/\d+/.test(request.externalUrl)) {
    directUrls.push(request.externalUrl)
  }

  const query = (request.title || request.description || request.categoryHint || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  if (!query && directUrls.length === 0) {
    throw new Error('Demande sans titre/description — rien à chercher')
  }

  return { request, query, directUrls }
}

async function search(state: typeof RequestState.State) {
  if (state.directUrls.length > 0) {
    return { offerUrls: state.directUrls, candidates: [] as Product1688[] }
  }
  const { urls, blockedReason } = await discover1688Urls(state.query, EXTRACT_LIMIT + 2)
  return { offerUrls: urls, candidates: [] as Product1688[], blockedReason }
}

function gateAfterSearch(state: typeof RequestState.State) {
  return state.offerUrls.length > 0 ? 'extract' : 'propose'
}

async function extract(state: typeof RequestState.State) {
  const candidates: Product1688[] = []
  let blockedReason: string | undefined

  for (const url of state.offerUrls) {
    if (candidates.length >= MAX_CANDIDATES) break
    if (candidates.length > 0) await humanDelay(3000, 7000)

    const t0 = Date.now()
    const result = await scrapeOne1688(url)
    console.log(`[sourcing-request] ${result.success ? '✓' : '✗'} ${url} (${Math.round((Date.now() - t0) / 1000)}s)`)

    const q = isQualityProduct(result.data)
    if (result.success && q.ok) {
      if (q.cleanedName) result.data!.name = q.cleanedName
      candidates.push(result.data!)
    } else {
      if (result.success) {
        console.log(`[sourcing-request] skip qualité ${url} (nameOk=${q.nameOk} priceOk=${q.priceOk} name="${result.data?.name?.slice(0, 40)}" price=${result.data?.price1688})`)
      }
      if (!result.success && /captcha|login|blocked|verify/i.test(result.error || '')) {
        blockedReason = result.error
        break
      }
    }
  }
  return { candidates, blockedReason }
}

/** Prix client estimé — même formule que la route proposal :
 *  coût (¥×taux×qté) + frais service + assurance + transport aérien éco. */
function score(state: typeof RequestState.State) {
  const qty = Math.max(1, state.request?.qty || 1)
  const rate = BASE_SHIPPING_RATES.air_15 // aérien économique = défaut proposition

  const scored = state.candidates.map((p) => {
    const exchangeRate = p.exchangeRate > 0 ? p.exchangeRate : DEFAULT_EXCHANGE_RATE
    const productCostFCFA = Math.round((p.price1688 || 0) * exchangeRate * qty)
    const serviceFeeAmount = Math.round(productCostFCFA * (DEFAULT_SERVICE_FEE_RATE / 100))
    const insuranceAmount = Math.round(productCostFCFA * (DEFAULT_INSURANCE_RATE / 100))
    const weightKg = (p.weightKg || 1) * qty
    const shippingCost = Math.max(rate.minimumCharge || 0, Math.round(rate.rate * weightKg))
    const totalClientPrice = Math.round(productCostFCFA + serviceFeeAmount + insuranceAmount + shippingCost)
    return { product: p, exchangeRate, productCostFCFA, serviceFeeAmount, insuranceAmount, shippingCost, totalClientPrice }
  })

  // Meilleur candidat = prix total le plus bas (heuristique simple, admin tranche)
  const best = scored.reduce((a, b) => (b.totalClientPrice < a.totalClientPrice ? b : a), scored[0])
  return {
    suggestion: best
      ? {
          candidates: scored.map((s) => ({
            name: s.product.name,
            url: s.product.productUrl,
            image: s.product.image || s.product.gallery?.[0],
            supplier: s.product.supplier?.name,
            price1688: s.product.price1688,
            totalClientPrice: s.totalClientPrice,
          })),
          best: {
            productName: best.product.name,
            productImage: best.product.image || best.product.gallery?.[0],
            productGallery: (best.product.gallery || []).slice(0, 8),
            supplierUrl: best.product.productUrl,
            supplierName: best.product.supplier?.name,
            price1688: best.product.price1688,
            exchangeRate: best.exchangeRate,
            productCostFCFA: best.productCostFCFA,
            serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
            serviceFeeAmount: best.serviceFeeAmount,
            insuranceRate: DEFAULT_INSURANCE_RATE,
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

async function propose(state: typeof RequestState.State) {
  const req = state.request
  const candidates = state.suggestion?.candidates || []

  // Idempotence : en cas de retry du job (même runId = jobId), réutiliser
  // la décision existante plutôt que créer un doublon dans la file admin.
  const existing = await AgentDecision.findOne({ runId: state.runId, status: 'pending' }).lean() as any
  if (existing) return { decisionId: String(existing._id) }

  // Alimenter externalSearchResults (affiché dans la page admin existante)
  if (candidates.length > 0) {
    await SourcingRequest.updateOne(
      { _id: state.requestId },
      {
        $set: {
          externalSearchResults: candidates.map((c: any) => ({
            title: c.name,
            price1688: c.price1688,
            image: c.image || '',
            url: c.url,
            supplier: c.supplier,
            platform: '1688',
            searchedAt: new Date(),
          })),
          status: 'searching',
        },
      }
    )
  }

  const decision = await AgentDecision.create({
    type: 'sourcing_request',
    refId: state.requestId,
    runId: state.runId,
    status: 'pending',
    proposal: {
      verdict: candidates.length > 0 ? 'approve' : 'unsure',
      confidence: candidates.length > 0 ? 0.7 : 0,
      reasons: candidates.length > 0
        ? [
            `${candidates.length} candidat(s) 1688 trouvé(s)`,
            `Meilleur prix estimé : ${state.suggestion.best.totalClientPrice.toLocaleString('fr-FR')} F livré`,
            state.blockedReason ? `Blocage partiel : ${state.blockedReason}` : null,
          ].filter(Boolean)
        : [state.blockedReason ? `Bloqué : ${state.blockedReason}` : 'Aucun candidat 1688 trouvé'],
      suggestedFixes: [],
      riskFlags: [],
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

  if (approved && state.suggestion?.best) {
    const b = state.suggestion.best
    // Brouillon de proposition — le formulaire admin se pré-remplit
    // (initProposalDraft lit request.proposal), l'admin ajuste et envoie.
    // Garde-fou : ne pas écraser si l'admin a déjà envoyé une proposition
    // manuellement pendant que la décision attendait.
    await SourcingRequest.updateOne(
      { _id: state.requestId, status: { $nin: ['proposal_sent', 'accepted', 'fulfilled', 'cancelled'] } },
      {
        $set: {
          status: 'proposal_ready',
          proposal: {
            ...b,
            notes: `Proposition agent IA — à vérifier avant envoi${decision.note ? ` — note admin : ${decision.note}` : ''}`,
            proposedBy: 'agent',
            proposedByName: 'Agent sourcing (IA)',
            proposedAt: new Date(),
            expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
          },
        },
      }
    )
    await notifyAdmins({
      type: 'success',
      title: `Proposition brouillon prête — ${req.reference}`,
      message: `Brouillon pré-rempli sur la demande. Vérifiez et envoyez au client depuis la fiche demande.`,
      actionUrl: '/admin/market/sourcing-requests',
      metadata: { requestId: state.requestId },
    })
  } else {
    await SourcingRequest.updateOne(
      { _id: state.requestId },
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
    .addNode('search', search)
    .addNode('extract', extract)
    .addNode('score', score)
    .addNode('propose', propose)
    .addNode('humanReview', humanReview)
    .addNode('apply', apply)
    .addEdge(START, 'loadRequest')
    .addEdge('loadRequest', 'search')
    .addConditionalEdges('search', gateAfterSearch)
    .addEdge('extract', 'score')
    .addEdge('score', 'propose')
    .addEdge('propose', 'humanReview')
    .addEdge('humanReview', 'apply')
    .addEdge('apply', END)
    .compile({ checkpointer: getCheckpointer() })
}

export function getSourcingRequestGraph() {
  if (!compiled) compiled = build()
  return compiled
}
