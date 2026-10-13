import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { verifyAuthServer } from '@/lib/auth-server'
import { aiAssist, type AssistType, type StructuredAdvice } from '@/lib/ai/assist'
import { checkAiAvailability, AiConfigMissingError, AiServiceUnavailableError } from '@/lib/ai/qwen'
import { checkAiEntitlement, refundAiCall, getAiFeaturesStatus, getAiConfig, type AiEntitlementDecision } from '@/lib/ai/entitlement'
import { prepareImagesForVision } from '@/lib/ai/images'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'
import { connectMongoose } from '@/lib/mongoose'
import { internalPost } from '@/lib/internal-auth'
import { isDdmBridgeEnabled } from '@/lib/wallet'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import ProviderProfile from '@/lib/models/ProviderProfile'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Statuts où une demande est encore ouverte aux offres (visible par tout prestataire). */
const OPEN_REQUEST_STATUSES = ['created', 'broadcasted', 'pending_offers']

type MaterialSuggestion = { term: string; products: Array<{ id: string; name: string; image: string | null; priceFcfa: number | null; stockStatus: string; path: string }> }

/** Empreinte du contenu analysé : la fiche est régénérée si le client modifie sa demande. */
function briefHash(sr: { category?: string; subcategory?: string; description?: string; attributes?: unknown; media?: unknown[] }): string {
  return createHash('sha1')
    .update(JSON.stringify([sr.category || '', sr.subcategory || '', sr.description || '', sr.attributes || {}, Array.isArray(sr.media) ? sr.media.length : 0]))
    .digest('hex')
}

/** Pont Xeuy → DDM+ : fournitures identifiées par l'IA → produits du catalogue (via API interne, jamais d'import de modèle market). */
async function suggestMaterials(request: NextRequest, advice?: StructuredAdvice): Promise<MaterialSuggestion[]> {
  const terms = advice?.materials || []
  if (terms.length === 0) return []
  const res = await internalPost<{ results?: MaterialSuggestion[] }>(request, '/api/internal/market/material-suggestions', { terms })
  const results = res?.results
  return Array.isArray(results) ? results.filter(r => Array.isArray(r?.products) && r.products.length > 0) : []
}

// 'mission_coach' est volontairement absent : la fiche est générée côté serveur
// à chaque transition de mission (mission-lifecycle → ai/mission-coach) et poussée
// via socket — elle n'est pas appelable par le client pour éviter la génération à la demande.
const VALID_TYPES: AssistType[] = ['enhance_request', 'clarify_request', 'analyze_request', 'mission_help', 'daily_tips', 'suggest_offer', 'general_chat']

async function computeMarketPrices(category: string): Promise<{ category: string; count: number; medianPrice: number; minPrice: number; maxPrice: number; avgPrice: number } | undefined> {
  try {
    await connectMongoose()
    // Find accepted offers for completed missions in the same category
    const completedRequests = await ServiceRequest.find(
      { category, status: 'completed' },
      { _id: 1 }
    ).limit(200).lean()

    if (completedRequests.length === 0) return undefined

    const requestIds = completedRequests.map(r => r._id)
    const offers = await Offer.find(
      { requestId: { $in: requestIds }, status: 'accepted' },
      { price: 1 }
    ).lean()

    const prices = offers.map(o => o.price).filter(p => typeof p === 'number' && p > 0)
    if (prices.length === 0) return undefined

    prices.sort((a, b) => a - b)
    const mid = Math.floor(prices.length / 2)
    const median = prices.length % 2 === 0 ? Math.round((prices[mid - 1] + prices[mid]) / 2) : prices[mid]

    return {
      category,
      count: prices.length,
      medianPrice: median,
      minPrice: prices[0],
      maxPrice: prices[prices.length - 1],
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
    }
  } catch (err) {
    console.warn('[AI assist] computeMarketPrices failed:', err instanceof Error ? err.message : err)
    return undefined
  }
}

async function getProviderStats(userId: string): Promise<{ completedMissions: number; rating: number }> {
  try {
    await connectMongoose()
    const profile = await ProviderProfile.findOne({ userId }).lean()
    const completedMissions = profile?.providerStats?.completedMissions || 0
    const rating = profile?.scoreXeuy || 0
    return { completedMissions, rating }
  } catch {
    return { completedMissions: 0, rating: 0 }
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.user.id

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const raw = body as Record<string, unknown>

    const type = raw.type as AssistType
    let category = typeof raw.category === 'string' ? raw.category.slice(0, 100) : undefined
    let description = typeof raw.description === 'string' ? raw.description.slice(0, 2000) : undefined
    // Attributs : objet clé/valeur (format ServiceRequest) ou tableau — bornés en taille
    let attributes: Record<string, any> | undefined = Array.isArray(raw.attributes)
      ? raw.attributes.slice(0, 50) as unknown as Record<string, any>
      : raw.attributes && typeof raw.attributes === 'object' && JSON.stringify(raw.attributes).length <= 4000
        ? raw.attributes as Record<string, any>
        : undefined
    const answers = Array.isArray(raw.answers)
      ? raw.answers
          .filter((a: unknown): a is { question?: unknown; answer?: unknown } => typeof a === 'object' && a !== null)
          .map((a) => ({
            question: typeof a.question === 'string' ? a.question.slice(0, 200) : '',
            answer: typeof a.answer === 'string' ? a.answer.slice(0, 500) : '',
          }))
          .slice(0, 20)
      : undefined
    const question = typeof raw.question === 'string' ? raw.question.slice(0, 500) : undefined
    const missionStatus = typeof raw.missionStatus === 'string' ? raw.missionStatus.slice(0, 50) : undefined
    const profile = typeof raw.profile === 'string' ? raw.profile.slice(0, 2000) : undefined
    const nearbyCount = typeof raw.nearbyCount === 'number' ? raw.nearbyCount : undefined
    const earnings = typeof raw.earnings === 'number' ? raw.earnings : undefined
    const rating = typeof raw.rating === 'number' ? raw.rating : undefined
    const requestBudget = typeof raw.requestBudget === 'number' ? raw.requestBudget : undefined
    const history = Array.isArray(raw.history)
      ? raw.history
          .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
            typeof m === 'object' && m !== null &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string')
          .map(m => ({ role: m.role, content: m.content.slice(0, 500) }))
          .slice(-8)
      : undefined

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    // Demande réelle (analyze_request / suggest_offer) : le contenu vient de la base, pas du client,
    // et l'analyse est partagée entre prestataires (générée et facturée une seule fois).
    const requestId = typeof raw.requestId === 'string' && /^[a-f0-9]{24}$/i.test(raw.requestId) ? raw.requestId : undefined
    let sr: any = null
    let srHash: string | undefined
    let effectiveBudget = requestBudget
    if (requestId && (type === 'analyze_request' || type === 'suggest_offer')) {
      await connectMongoose()
      sr = await ServiceRequest.findById(requestId)
        .select('clientId assignedProviderId status category subcategory description attributes budget media urgent aiBrief')
        .lean()
      if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
      const canRead = ['ADMIN', 'SUPER_ADMIN'].includes(auth.user.role)
        || String(sr.clientId) === String(userId)
        || String(sr.assignedProviderId || '') === String(userId)
        || OPEN_REQUEST_STATUSES.includes(sr.status)
      if (!canRead) return NextResponse.json({ error: 'Interdit' }, { status: 403 })
      category = sr.category
      description = typeof sr.description === 'string' ? sr.description.slice(0, 2000) : undefined
      attributes = sr.attributes && typeof sr.attributes === 'object' ? sr.attributes : undefined
      effectiveBudget = typeof sr.budget === 'number' && sr.budget > 0 ? sr.budget : requestBudget
      srHash = briefHash(sr)

      // Fiche déjà générée pour ce contenu → renvoyée gratuitement
      if (type === 'analyze_request' && sr.aiBrief?.advice && sr.aiBrief.hash === srHash) {
        const ddmBridge = await isDdmBridgeEnabled()
        return NextResponse.json({
          text: sr.aiBrief.advice.summary || sr.aiBrief.advice.title,
          advice: sr.aiBrief.advice,
          // Intégration DDM+ « bientôt » : les anciennes versions de l'app ne reçoivent aucun produit
          materials: ddmBridge ? sr.aiBrief.materialProducts || [] : [],
          ddmBridge,
          cached: true,
          source: 'cache',
          model: sr.aiBrief.model,
          usage: { cost: 0 },
        })
      }
    }

    // Photos du client (URLs publiques issues de /api/upload ou data URIs) — vision uniquement pour clarify/enhance
    const aiCfg = await getAiConfig()
    const rawImageUrls = Array.isArray(raw.imageUrls) && (type === 'clarify_request' || type === 'enhance_request')
      ? raw.imageUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      : []
    const imageUrls = rawImageUrls.length > 0 ? await prepareImagesForVision(rawImageUrls, aiCfg.maxImagesPerCall) : undefined
    const hasImages = !!imageUrls && imageUrls.length > 0

    // Droit d'usage (gratuit MVP / quota / éligibilité / XC) — piloté depuis l'admin
    const entitlement: AiEntitlementDecision = await checkAiEntitlement(userId, auth.user.role, type, { vision: hasImages })
    if (!entitlement.allowed) {
      const status = entitlement.reason === 'ai_disabled' ? 403 : 402
      const messages: Record<string, string> = {
        ai_disabled: 'Assistant IA désactivé',
        quota_exceeded: 'Quota IA du jour atteint',
        insufficient_points: 'Solde XC insuffisant pour utiliser l\'assistant IA',
      }
      return NextResponse.json({
        error: messages[entitlement.reason || 'ai_disabled'],
        code: entitlement.reason,
        cost: entitlement.cost,
        balance: entitlement.balance,
      }, { status })
    }

    // For suggest_offer, compute market prices and provider stats
    let marketPrices: Awaited<ReturnType<typeof computeMarketPrices>>
    let providerCompletedMissions: number | undefined
    let providerRating: number | undefined

    if (type === 'suggest_offer') {
      if (category) {
        marketPrices = await computeMarketPrices(category)
      }
      const stats = await getProviderStats(userId)
      providerCompletedMissions = stats.completedMissions
      providerRating = stats.rating
    }

    let result: Awaited<ReturnType<typeof aiAssist>>
    try {
      result = await aiAssist({
        type: type as AssistType,
        category,
        description,
        attributes,
        answers: Array.isArray(answers) ? answers : undefined,
        question,
        imageUrls,
        missionStatus,
        profile,
        nearbyCount,
        earnings,
        rating: rating ?? providerRating,
        requestBudget: effectiveBudget,
        marketPrices,
        providerCompletedMissions,
        history,
        mission: sr ? {
          subcategory: sr.subcategory,
          clientImageCount: Array.isArray(sr.media) ? sr.media.filter((m: any) => m?.type === 'image').length : 0,
          urgent: !!sr.urgent,
        } : undefined,
      })
    } catch (aiErr) {
      // Le modèle a échoué : on ne facture pas l'appel
      await refundAiCall(userId, entitlement, type)
      throw aiErr
    }

    let materials: MaterialSuggestion[] | undefined
    if (type === 'analyze_request' && result.advice) {
      materials = await suggestMaterials(request, result.advice).catch(() => [])
      if (sr && srHash) {
        // Mise en cache sur la demande (premier généré gagne ; remplacé si le contenu a changé)
        await ServiceRequest.updateOne(
          { _id: sr._id, $or: [{ aiBrief: { $exists: false } }, { aiBrief: null }, { 'aiBrief.hash': { $ne: srHash } }] },
          { $set: { aiBrief: { advice: result.advice, materialProducts: materials, hash: srHash, model: result.model, generatedAt: new Date() } } }
        ).catch((err: unknown) => console.warn('[AI assist] aiBrief cache failed:', err instanceof Error ? err.message : err))
      }
    }

    const ddmBridge = type === 'analyze_request' ? await isDdmBridgeEnabled() : undefined
    return NextResponse.json({
      text: result.text,
      questions: result.questions,
      observations: result.observations,
      photoGuidance: result.photoGuidance,
      vision: result.vision,
      advice: result.advice,
      materials: ddmBridge === false ? [] : materials,
      ddmBridge,
      suggestedPrice: result.suggestedPrice,
      priceAdjusted: result.priceAdjusted,
      suggestedMessage: result.suggestedMessage,
      reasoning: result.reasoning,
      marketPrices: marketPrices ? { count: marketPrices.count, medianPrice: marketPrices.medianPrice, avgPrice: marketPrices.avgPrice } : undefined,
      source: result.source,
      model: result.model,
      usage: { cost: entitlement.cost, quotaRemaining: entitlement.quotaRemaining, balance: entitlement.balance },
    })
  } catch (e: unknown) {
    console.error('[POST /api/ai/assist]', e)
    if (e instanceof AiConfigMissingError || e instanceof AiServiceUnavailableError) {
      return NextResponse.json({ error: e.message }, { status: 503 })
    }
    const message = e instanceof Error ? e.message : 'Service AI temporairement indisponible'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  const status = await checkAiAvailability()

  // Si authentifié : état des fonctionnalités IA pour cet utilisateur (quota, XC, éligibilité) → le mobile masque/affiche les boutons
  const auth = await verifyAuthServer(request).catch(() => null)
  if (auth?.isAuthenticated && auth.user) {
    try {
      const features = await getAiFeaturesStatus(auth.user.id, auth.user.role)
      return NextResponse.json({ ...status, available: status.available && features.enabled, ...features })
    } catch (err) {
      console.warn('[GET /api/ai/assist] features status failed:', err instanceof Error ? err.message : err)
    }
  }
  return NextResponse.json(status)
}
