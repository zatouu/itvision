import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { aiAssist, type AssistType } from '@/lib/ai/assist'
import { checkAiAvailability, AiConfigMissingError, AiServiceUnavailableError } from '@/lib/ai/qwen'
import { checkAiEntitlement, refundAiCall, getAiFeaturesStatus, getAiConfig, type AiEntitlementDecision } from '@/lib/ai/entitlement'
import { prepareImagesForVision } from '@/lib/ai/images'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import ProviderProfile from '@/lib/models/ProviderProfile'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_TYPES: AssistType[] = ['enhance_request', 'clarify_request', 'analyze_request', 'mission_help', 'daily_tips', 'suggest_offer']

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
    const category = typeof raw.category === 'string' ? raw.category.slice(0, 100) : undefined
    const description = typeof raw.description === 'string' ? raw.description.slice(0, 2000) : undefined
    const attributes = Array.isArray(raw.attributes) ? raw.attributes.slice(0, 50) : undefined
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

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
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
        requestBudget,
        marketPrices,
        providerCompletedMissions,
      })
    } catch (aiErr) {
      // Le modèle a échoué : on ne facture pas l'appel
      await refundAiCall(userId, entitlement, type)
      throw aiErr
    }

    return NextResponse.json({
      text: result.text,
      questions: result.questions,
      observations: result.observations,
      photoGuidance: result.photoGuidance,
      vision: result.vision,
      suggestedPrice: result.suggestedPrice,
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
